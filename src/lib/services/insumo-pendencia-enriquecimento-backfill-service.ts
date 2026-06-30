import type {
  InsumoEntradaPendenciaRow,
  RecebimentoPendenciaChave,
} from '@/domain/types/insumo-estoque-db';
import {
  indexarItensRecebimentoPorIdItem,
  montarEnriquecimentoPendencia,
} from '@/domain/insumos/insumo-pendencia-enriquecimento';
import {
  insumoRecebimentoCategoriaService,
  type InsumoRecebimentoCategoriaService,
} from '@/domain/insumos/insumo-recebimento-categoria-service';
import type { EmpresaCredenciaisRow } from '@/data/omie/OmieWebhookEventoRepository';
import {
  insumoPendenciaRepository,
  InsumoPendenciaRepository,
} from '@/data/insumos/InsumoPendenciaRepository';
import {
  omieRecebimentoClient,
  OmieRecebimentoClient,
} from '@/lib/clients/omie-recebimento-client';

const PAUSA_ENTRE_RECEBIMENTOS_MS = 350;

export type InsumoPendenciaEnriquecimentoBackfillInput = {
  empresaId?: string;
  limitRecebimentos?: number;
  forcar?: boolean;
  incluirIgnorados?: boolean;
  todosStatus?: boolean;
  dryRun?: boolean;
};

export type InsumoPendenciaEnriquecimentoBackfillResult = {
  recebimentosConsultados: number;
  pendenciasAtualizadas: number;
  pendenciasSemItem: number;
  erros: number;
};

type BackfillDeps = {
  pendenciaRepository: InsumoPendenciaRepository;
  client: OmieRecebimentoClient;
  categoriaService: InsumoRecebimentoCategoriaService;
  listarEmpresas: () => Promise<EmpresaCredenciaisRow[]>;
};

export class InsumoPendenciaEnriquecimentoBackfillService {
  constructor(private readonly deps: BackfillDeps) {}

  async executar(
    input: InsumoPendenciaEnriquecimentoBackfillInput = {},
  ): Promise<InsumoPendenciaEnriquecimentoBackfillResult> {
    const empresas = await this.deps.listarEmpresas();
    const empresasPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]));

    const pendencias = await this.deps.pendenciaRepository.listParaEnriquecimento({
      empresaId: input.empresaId,
      forcar: input.forcar,
      incluirIgnorados: input.incluirIgnorados,
      todosStatus: input.todosStatus,
    });

    const chaves = this.agruparRecebimentosUnicos(pendencias);
    const limite = input.limitRecebimentos ?? chaves.length;
    const alvo = chaves.slice(0, limite);

    const result: InsumoPendenciaEnriquecimentoBackfillResult = {
      recebimentosConsultados: 0,
      pendenciasAtualizadas: 0,
      pendenciasSemItem: 0,
      erros: 0,
    };

    for (const chave of alvo) {
      const empresa = empresasPorId.get(chave.empresaId);
      if (!empresa) {
        result.erros += 1;
        console.error(`  [erro] empresa não encontrada: ${chave.empresaId}`);
        continue;
      }

      const pendenciasReceb = pendencias.filter(
        (pendencia) =>
          pendencia.empresa_id === chave.empresaId &&
          pendencia.omie_n_id_receb === chave.omieNIdReceb,
      );

      try {
        if (input.dryRun) {
          console.log(
            `  [dry-run] ${empresa.nome} | nIdReceb ${chave.omieNIdReceb} | ${pendenciasReceb.length} pendência(s)`,
          );
          result.recebimentosConsultados += 1;
          continue;
        }

        const recebimento = await this.deps.client.consultarRecebimento({
          appKey: empresa.app_key,
          appSecret: empresa.app_secret,
          nIdReceb: chave.omieNIdReceb,
        });
        result.recebimentosConsultados += 1;

        const empresaCredenciais = {
          empresaId: empresa.id,
          appKey: empresa.app_key,
          appSecret: empresa.app_secret,
        };
        const categoriaRecebimento = await this.deps.categoriaService.resolverCategoriaRecebimento({
          empresa: empresaCredenciais,
          infoAdicionais: recebimento.infoAdicionais,
        });

        const itensPorId = indexarItensRecebimentoPorIdItem(recebimento.itensCabec ?? []);

        for (const pendencia of pendenciasReceb) {
          const item = itensPorId.get(pendencia.omie_n_id_item);
          if (!item) {
            result.pendenciasSemItem += 1;
            console.warn(
              `  [aviso] item ${pendencia.omie_n_id_item} não encontrado no recebimento ${chave.omieNIdReceb}`,
            );
            continue;
          }

          const categoriaItem = await this.deps.categoriaService.resolverCategoriaItem({
            empresa: empresaCredenciais,
            infoAdicionais: recebimento.infoAdicionais,
            item,
            categoriaRecebimento,
          });

          const enriquecimento = montarEnriquecimentoPendencia({
            cabec: recebimento.cabec,
            item,
            infoAdicionais: recebimento.infoAdicionais,
            categoriaCompraCodigo: categoriaItem.codigo,
            categoriaCompraDescricao: categoriaItem.descricao,
          });

          await this.deps.pendenciaRepository.atualizarEnriquecimentoOmie(
            pendencia.id,
            enriquecimento,
          );
          result.pendenciasAtualizadas += 1;
        }

        await this.pausarEntreConsultas();
      } catch (error) {
        result.erros += 1;
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(
          `  [erro] ${empresa.nome} | nIdReceb ${chave.omieNIdReceb}: ${mensagem}`,
        );
      }
    }

    return result;
  }

  private agruparRecebimentosUnicos(
    pendencias: InsumoEntradaPendenciaRow[],
  ): RecebimentoPendenciaChave[] {
    const vistos = new Set<string>();
    const chaves: RecebimentoPendenciaChave[] = [];

    for (const pendencia of pendencias) {
      const key = `${pendencia.empresa_id}:${pendencia.omie_n_id_receb}`;
      if (vistos.has(key)) continue;
      vistos.add(key);
      chaves.push({
        empresaId: pendencia.empresa_id,
        omieNIdReceb: pendencia.omie_n_id_receb,
      });
    }

    return chaves;
  }

  private async pausarEntreConsultas(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_RECEBIMENTOS_MS));
  }
}

export const insumoPendenciaEnriquecimentoBackfillService =
  new InsumoPendenciaEnriquecimentoBackfillService({
    pendenciaRepository: insumoPendenciaRepository,
    client: omieRecebimentoClient,
    categoriaService: insumoRecebimentoCategoriaService,
    listarEmpresas: async () => {
      const { OmieWebhookEventoRepository } = await import(
        '@/data/omie/OmieWebhookEventoRepository'
      );
      return new OmieWebhookEventoRepository().listEmpresas();
    },
  });
