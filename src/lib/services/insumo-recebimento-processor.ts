import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';
import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';
import type { IntegracaoInsumoRow } from '@/domain/types/insumo-estoque-db';
import {
  insumoMapeamentoRepository,
  InsumoMapeamentoRepository,
} from '@/data/insumos/InsumoMapeamentoRepository';
import {
  insumoPendenciaRepository,
  InsumoPendenciaRepository,
} from '@/data/insumos/InsumoPendenciaRepository';
import {
  omieWebhookEventoRepository,
  OmieWebhookEventoRepository,
  type OmieWebhookEventoRow,
} from '@/data/omie/OmieWebhookEventoRepository';
import {
  omieRecebimentoClient,
  OmieRecebimentoClient,
} from '@/lib/clients/omie-recebimento-client';
import {
  insumoEstoqueService,
  InsumoEstoqueService,
} from '@/lib/services/insumo-estoque-service';

type ProcessarItemInput = {
  empresaId: string;
  eventoId: string;
  nIdReceb: number;
  numeroNf: string;
  dataEmissaoNf: string | null;
  item: OmieRecebimentoItem;
};

export type InsumoRecebimentoProcessorDeps = {
  client: OmieRecebimentoClient;
  webhookRepository: OmieWebhookEventoRepository;
  mapeamentoRepository: InsumoMapeamentoRepository;
  pendenciaRepository: InsumoPendenciaRepository;
  estoqueService: InsumoEstoqueService;
};

export class InsumoRecebimentoProcessor {
  constructor(private readonly deps: InsumoRecebimentoProcessorDeps) {}

  async processarEvento(evento: OmieWebhookEventoRow): Promise<void> {
    const payload = evento.payload_json as {
      appKey?: string;
      event?: { cabecalho?: { nIdReceb?: number } };
    };
    const appKey = payload.appKey ?? evento.app_key_recebida;
    const nIdReceb = payload.event?.cabecalho?.nIdReceb;

    if (!nIdReceb) {
      throw new Error('nIdReceb ausente');
    }

    const empresa = await this.deps.webhookRepository.findEmpresaByAppKey(appKey);
    if (!empresa) {
      throw new Error(`Empresa não encontrada para app_key ${appKey}`);
    }

    const recebimento = await this.deps.client.consultarRecebimento({
      appKey: empresa.app_key,
      appSecret: empresa.app_secret,
      nIdReceb,
    });

    const numeroNf = recebimento.cabec?.cNumeroNF ?? '';
    const dataEmissaoNf = recebimento.cabec?.dDataEmissao ?? null;
    const itens = recebimento.itensCabec ?? [];

    for (const item of itens) {
      await this.processarItem({
        empresaId: empresa.id,
        eventoId: evento.id,
        nIdReceb,
        numeroNf,
        dataEmissaoNf,
        item,
      });
    }
  }

  async processarPendentes(limit = 20): Promise<{ processados: number; erros: number }> {
    const eventos = await this.deps.webhookRepository.listPendentesRecebimento(limit);
    let processados = 0;
    let erros = 0;

    for (const evento of eventos) {
      try {
        await this.processarEvento(evento);
        await this.deps.webhookRepository.marcarProcessado(evento.id);
        processados += 1;
      } catch (error) {
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        await this.deps.webhookRepository.marcarErro(evento.id, mensagem);
        erros += 1;
      }
    }

    return { processados, erros };
  }

  async processarItem(input: ProcessarItemInput): Promise<void> {
    if (input.item.cIgnorarItem === 'S') {
      return;
    }

    const mapeamento = await this.deps.mapeamentoRepository.findByEmpresaProduto(
      input.empresaId,
      input.item.nIdProduto,
    );

    if (mapeamento) {
      await this.registrarEntradaMapeada({
        empresaId: input.empresaId,
        eventoId: input.eventoId,
        nIdReceb: input.nIdReceb,
        item: input.item,
        mapeamento,
      });
      return;
    }

    await this.deps.pendenciaRepository.createPendente({
      empresaId: input.empresaId,
      omieWebhookEventoId: input.eventoId,
      omieNIdReceb: input.nIdReceb,
      omieNIdItem: input.item.nIdItem,
      omieIdProduto: input.item.nIdProduto,
      omieCodigoProduto: input.item.cCodigoProduto,
      descricaoProduto: input.item.cDescricaoProduto,
      quantidadeNf: input.item.nQtdeNfe,
      unidadeNf: input.item.cUnidadeNfe,
      precoUnitNf: input.item.nPrecoUnit,
      valorTotalItem: input.item.vTotalItem,
      numeroNf: input.numeroNf,
      dataEmissaoNf: input.dataEmissaoNf,
    });
  }

  private async registrarEntradaMapeada(params: {
    empresaId: string;
    eventoId: string;
    nIdReceb: number;
    item: OmieRecebimentoItem;
    mapeamento: IntegracaoInsumoRow;
  }): Promise<void> {
    const quantidadeEntrada = calcularQuantidadeEntrada(
      params.item.nQtdeNfe,
      Number(params.mapeamento.fator_conversao),
    );
    const custoUnitario = calcularCustoUnitarioEntrada(
      params.item.vTotalItem,
      quantidadeEntrada,
    );

    await this.deps.estoqueService.registrarEntrada({
      insumoId: params.mapeamento.insumo_id,
      empresaId: params.empresaId,
      quantidadeEntrada,
      custoUnitario,
      origem: 'entrada_nf',
      omieNIdReceb: params.nIdReceb,
      omieNIdItem: params.item.nIdItem,
      omieWebhookEventoId: params.eventoId,
    });
  }
}

export const insumoRecebimentoProcessor = new InsumoRecebimentoProcessor({
  client: omieRecebimentoClient,
  webhookRepository: omieWebhookEventoRepository,
  mapeamentoRepository: insumoMapeamentoRepository,
  pendenciaRepository: insumoPendenciaRepository,
  estoqueService: insumoEstoqueService,
});
