import {
  OMIE_ETAPA_RECEBIMENTO_CONCLUIDO,
  type InsumoRecebimentoBackfillCriterioData,
  type OmieListarRecebimentosFiltro,
  type OmieRecebimentoCabecalhoResumo,
} from '@/domain/types/omie-recebimento-list';
import { OMIE_TOPIC_RECEBIMENTO_CONCLUIDO } from '@/domain/types/omie-webhook';
import {
  OMIE_WEBHOOK_STATUS,
  type EmpresaCredenciaisRow,
  type OmieWebhookEventoRow,
  OmieWebhookEventoRepository,
} from '@/data/omie/OmieWebhookEventoRepository';
import {
  omieRecebimentoClient,
  OmieRecebimentoClient,
} from '@/lib/clients/omie-recebimento-client';
import {
  insumoRecebimentoProcessor,
  InsumoRecebimentoProcessor,
} from '@/lib/services/insumo-recebimento-processor';

const REGISTROS_POR_PAGINA = 50;

export type InsumoRecebimentoBackfillResult = {
  empresas: number;
  listados: number;
  jaProcessados: number;
  processados: number;
  erros: number;
};

export type InsumoRecebimentoBackfillInput = {
  dataDe: string;
  dataAte: string;
  /** `recebimento` = dtAlt (data em que concluiu no Omie); `emissao` = dtEmissao da NF */
  criterioData?: InsumoRecebimentoBackfillCriterioData;
  empresaId?: string;
  dryRun?: boolean;
  reprocessar?: boolean;
};

export class InsumoRecebimentoBackfillService {
  constructor(
    private readonly deps: {
      client: OmieRecebimentoClient;
      webhookRepository: OmieWebhookEventoRepository;
      processor: InsumoRecebimentoProcessor;
    },
  ) {}

  async backfillPorPeriodo(
    input: InsumoRecebimentoBackfillInput,
  ): Promise<InsumoRecebimentoBackfillResult> {
    const empresas = await this.listarEmpresasAlvo(input.empresaId);
    const result: InsumoRecebimentoBackfillResult = {
      empresas: empresas.length,
      listados: 0,
      jaProcessados: 0,
      processados: 0,
      erros: 0,
    };

    for (const empresa of empresas) {
      let cabecalhos: OmieRecebimentoCabecalhoResumo[] = [];
      try {
        cabecalhos = await this.listarRecebimentosConcluidos(empresa, input);
      } catch (error) {
        result.erros += 1;
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`  [erro] ${empresa.nome} | listagem Omie: ${mensagem}`);
        continue;
      }

      result.listados += cabecalhos.length;
      console.log(`  ${empresa.nome}: ${cabecalhos.length} recebimento(s) concluído(s)`);

      for (const cabec of cabecalhos) {
        const messageId = this.buildBackfillMessageId(cabec.nIdReceb);
        const existente = await this.deps.webhookRepository.findByMessageId(messageId);

        if (
          existente?.status_processamento === OMIE_WEBHOOK_STATUS.PROCESSADO &&
          !input.reprocessar
        ) {
          result.jaProcessados += 1;
          continue;
        }

        if (input.dryRun) {
          continue;
        }

        let evento: OmieWebhookEventoRow | null = existente;
        try {
          evento = await this.ensureEvento(empresa, cabec, existente, messageId);
          await this.deps.processor.processarEvento(evento);
          await this.deps.webhookRepository.marcarProcessado(evento.id);
          result.processados += 1;
        } catch (error) {
          result.erros += 1;
          const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
          console.error(
            `  [erro] ${empresa.nome} | nIdReceb ${cabec.nIdReceb}: ${mensagem}`,
          );

          if (evento) {
            await this.deps.webhookRepository.marcarErro(evento.id, mensagem);
          }
        }
      }
    }

    return result;
  }

  private async listarEmpresasAlvo(empresaId?: string): Promise<EmpresaCredenciaisRow[]> {
    const empresas = await this.deps.webhookRepository.listEmpresas();
    if (!empresaId) {
      return empresas;
    }

    const filtradas = empresas.filter((empresa) => empresa.id === empresaId);
    if (filtradas.length === 0) {
      throw new Error(`Empresa não encontrada: ${empresaId}`);
    }

    return filtradas;
  }

  private async listarRecebimentosConcluidos(
    empresa: EmpresaCredenciaisRow,
    input: InsumoRecebimentoBackfillInput,
  ): Promise<OmieRecebimentoCabecalhoResumo[]> {
    const cabecalhos: OmieRecebimentoCabecalhoResumo[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    while (pagina <= totalPaginas) {
      const resposta = await this.listarPaginaComRetry(empresa, input, pagina);
      totalPaginas = resposta.nTotalPaginas || 1;

      for (const recebimento of resposta.recebimentos ?? []) {
        const cabec = OmieRecebimentoClient.extrairCabecalho(recebimento);
        if (cabec) {
          cabecalhos.push(cabec);
        }
      }

      pagina += 1;
    }

    return cabecalhos;
  }

  private async listarPaginaComRetry(
    empresa: EmpresaCredenciaisRow,
    input: InsumoRecebimentoBackfillInput,
    pagina: number,
  ) {
    let ultimoErro: Error | null = null;

    for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
      try {
        return await this.deps.client.listarRecebimentos({
          appKey: empresa.app_key,
          appSecret: empresa.app_secret,
          filtro: this.montarFiltroListagem(input, pagina),
        });
      } catch (error) {
        ultimoErro = error instanceof Error ? error : new Error('Erro desconhecido');
        if (tentativa < 3) {
          await new Promise((resolve) => setTimeout(resolve, tentativa * 1000));
        }
      }
    }

    throw ultimoErro ?? new Error('Falha ao listar recebimentos Omie');
  }

  private montarFiltroListagem(
    input: InsumoRecebimentoBackfillInput,
    pagina: number,
  ): OmieListarRecebimentosFiltro {
    const base = {
      nPagina: pagina,
      nRegistrosPorPagina: REGISTROS_POR_PAGINA,
      cEtapa: OMIE_ETAPA_RECEBIMENTO_CONCLUIDO,
      cExibirDetalhes: 'N' as const,
    };

    const criterio = input.criterioData ?? 'recebimento';
    if (criterio === 'emissao') {
      return {
        ...base,
        dtEmissaoDe: input.dataDe,
        dtEmissaoAte: input.dataAte,
      };
    }

    return {
      ...base,
      dtAltDe: input.dataDe,
      dtAltAte: input.dataAte,
    };
  }

  private buildBackfillMessageId(nIdReceb: number): string {
    return `backfill-recebimento-${nIdReceb}`;
  }

  private async ensureEvento(
    empresa: EmpresaCredenciaisRow,
    cabec: OmieRecebimentoCabecalhoResumo,
    existente: OmieWebhookEventoRow | null,
    messageId: string,
  ): Promise<OmieWebhookEventoRow> {
    if (existente) {
      return existente;
    }

    return this.deps.webhookRepository.registrarEvento({
      empresaId: empresa.id,
      appKeyRecebida: empresa.app_key,
      topic: OMIE_TOPIC_RECEBIMENTO_CONCLUIDO,
      messageId,
      payloadJson: {
        appKey: empresa.app_key,
        topic: OMIE_TOPIC_RECEBIMENTO_CONCLUIDO,
        origin: 'backfill',
        event: {
          cabecalho: {
            nIdReceb: cabec.nIdReceb,
            cNumeroNFe: cabec.cNumeroNFe,
            dEmissaoNFe: cabec.dEmissaoNFe,
          },
        },
      },
    });
  }
}

export const insumoRecebimentoBackfillService = new InsumoRecebimentoBackfillService({
  client: omieRecebimentoClient,
  webhookRepository: new OmieWebhookEventoRepository(),
  processor: insumoRecebimentoProcessor,
});
