import {
  InsumoConsumoProdutividadeFator,
  type ProdutividadeConsumoChange,
} from '@/domain/insumos/insumo-consumo-produtividade-change';
import { InsumoConsumoProdutividadeEtapaMapper } from '@/domain/insumos/insumo-consumo-produtividade-etapa-mapper';
import {
  insumoConsumoProdutividadeLoteRepository,
  InsumoConsumoProdutividadeLoteRepository,
} from '@/data/insumos/InsumoConsumoProdutividadeLoteRepository';
import { idListChunker } from '@/data/insumos/IdListChunker';
import {
  insumoEstoqueService,
  InsumoEstoqueService,
} from '@/lib/services/insumo-estoque-service';
import {
  insumoConsumoEmbalagemService,
  InsumoConsumoEmbalagemService,
} from '@/lib/services/insumo-consumo-embalagem-service';
import {
  insumoConsumoFornoService,
  InsumoConsumoFornoService,
} from '@/lib/services/insumo-consumo-forno-service';
import {
  insumoConsumoProducaoService,
  InsumoConsumoProducaoService,
} from '@/lib/services/insumo-consumo-producao-service';
import type { InsumoMovimentoLoteColuna } from '@/data/insumos/InsumoEstoqueRepository';
import type { InsumoMovimentoOrigem } from '@/domain/types/insumo-estoque';

export type ConsumoProdutividadeBackfillPreviewItem = {
  produtoId: string;
  produtoNome: string;
  tipo: string;
  quantidadeAntes: number;
  quantidadeDepois: number;
  fator: number;
  lotesAfetados: number;
  deltasPorInsumo: Array<{ insumoId: string; deltaAtual: number; deltaEstimado: number }>;
};

export type ConsumoProdutividadeBackfillPreview = {
  items: ConsumoProdutividadeBackfillPreviewItem[];
  lotesTotais: number;
  avisos: string[];
};

export type ConsumoProdutividadeBackfillResult = {
  lotesProcessados: number;
  movimentosInseridos: number;
  avisos: string[];
};

export class InsumoConsumoProdutividadeBackfillService {
  constructor(
    private readonly loteRepository: InsumoConsumoProdutividadeLoteRepository =
      insumoConsumoProdutividadeLoteRepository,
    private readonly estoqueService: InsumoEstoqueService = insumoEstoqueService,
    private readonly embalagemService: InsumoConsumoEmbalagemService =
      insumoConsumoEmbalagemService,
    private readonly fornoService: InsumoConsumoFornoService = insumoConsumoFornoService,
    private readonly fermentacaoService: InsumoConsumoProducaoService =
      insumoConsumoProducaoService,
  ) {}

  async preview(
    changes: ProdutividadeConsumoChange[],
    desdeIso?: string | null,
  ): Promise<ConsumoProdutividadeBackfillPreview> {
    const items: ConsumoProdutividadeBackfillPreviewItem[] = [];
    const avisos: string[] = [];
    let lotesTotais = 0;

    for (const change of changes.filter(InsumoConsumoProdutividadeFator.mudou)) {
      const etapa = InsumoConsumoProdutividadeEtapaMapper.fromTipo(change.tipo);
      const fator = InsumoConsumoProdutividadeFator.calcular(
        change.quantidadeAntes,
        change.quantidadeDepois,
      );
      if (!etapa || fator == null) {
        avisos.push(`${change.produtoNome}: tipo/fator inválido para backfill.`);
        continue;
      }

      const lotes = await this.loteRepository.listLoteIdsByProduto({
        produtoId: change.produtoId,
        coluna: etapa.coluna,
        desdeIso,
      });
      const insumoIds = await this.loteRepository.listReceitaInsumoIds(change.receitaId);
      const deltas = await this.loteRepository.sumDeltasByLotesInsumos({
        coluna: etapa.coluna,
        loteIds: lotes.map((lote) => lote.id),
        insumoIds,
        excluirBackfill: true,
      });

      lotesTotais += lotes.length;
      items.push({
        produtoId: change.produtoId,
        produtoNome: change.produtoNome,
        tipo: change.tipo,
        quantidadeAntes: change.quantidadeAntes,
        quantidadeDepois: change.quantidadeDepois,
        fator,
        lotesAfetados: lotes.length,
        deltasPorInsumo: [...deltas.entries()].map(([insumoId, deltaAtual]) => ({
          insumoId,
          deltaAtual,
          deltaEstimado: deltaAtual * fator,
        })),
      });
    }

    return { items, lotesTotais, avisos };
  }

  async apply(
    changes: ProdutividadeConsumoChange[],
    desdeIso?: string | null,
  ): Promise<ConsumoProdutividadeBackfillResult> {
    let lotesProcessados = 0;
    let movimentosInseridos = 0;
    const avisos: string[] = [];

    for (const change of changes.filter(InsumoConsumoProdutividadeFator.mudou)) {
      const etapa = InsumoConsumoProdutividadeEtapaMapper.fromTipo(change.tipo);
      const fator = InsumoConsumoProdutividadeFator.calcular(
        change.quantidadeAntes,
        change.quantidadeDepois,
      );
      if (!etapa || fator == null) {
        avisos.push(`${change.produtoNome}: tipo/fator inválido para backfill.`);
        continue;
      }

      const lotes = await this.loteRepository.listLoteIdsByProduto({
        produtoId: change.produtoId,
        coluna: etapa.coluna,
        desdeIso,
      });

      if (etapa.usaFatorSeguro) {
        const result = await this.applyFator({
          change,
          fator,
          coluna: etapa.coluna,
          origem: etapa.origem,
          lotes,
        });
        lotesProcessados += result.lotesProcessados;
        movimentosInseridos += result.movimentosInseridos;
        avisos.push(...result.avisos);
        continue;
      }

      const result = await this.applyReconciliar(change, lotes.map((lote) => lote.id));
      lotesProcessados += result.lotesProcessados;
      movimentosInseridos += result.movimentosInseridos;
      avisos.push(...result.avisos);
    }

    return { lotesProcessados, movimentosInseridos, avisos };
  }

  private async applyFator(input: {
    change: ProdutividadeConsumoChange;
    fator: number;
    coluna: InsumoMovimentoLoteColuna;
    origem: InsumoMovimentoOrigem;
    lotes: Array<{ id: string; produzidoEm: string }>;
  }): Promise<ConsumoProdutividadeBackfillResult> {
    const insumoIds = await this.loteRepository.listReceitaInsumoIds(input.change.receitaId);
    let lotesProcessados = 0;
    let movimentosInseridos = 0;
    const avisos: string[] = [];
    const observacao = `Backfill produtividade ${input.change.tipo}: ${input.change.quantidadeAntes} → ${input.change.quantidadeDepois}`;
    const produzidoEmById = new Map(input.lotes.map((lote) => [lote.id, lote.produzidoEm]));

    for (const chunk of idListChunker.chunk(input.lotes.map((lote) => lote.id))) {
      for (const loteId of chunk) {
        const deltas = await this.loteRepository.sumDeltasByLotesInsumos({
          coluna: input.coluna,
          loteIds: [loteId],
          insumoIds,
          excluirBackfill: true,
        });
        const deltasBackfill = await this.loteRepository.sumDeltasByLotesInsumos({
          coluna: input.coluna,
          loteIds: [loteId],
          insumoIds,
        });

        let mudou = false;
        for (const [insumoId, deltaOriginal] of deltas) {
          const alvo = deltaOriginal * input.fator;
          const deltaAtualComBackfill = deltasBackfill.get(insumoId) ?? 0;
          const deltaNecessario = alvo - deltaAtualComBackfill;
          if (Math.abs(deltaNecessario) < 1e-9) continue;

          await this.estoqueService.aplicarDelta({
            insumoId,
            delta: deltaNecessario,
            origem: input.origem,
            observacao,
            createdAt: produzidoEmById.get(loteId) ?? null,
            ...(input.coluna === 'fermentacao_lote_id'
              ? { fermentacaoLoteId: loteId }
              : input.coluna === 'forno_lote_id'
                ? { fornoLoteId: loteId }
                : { embalagemLoteId: loteId }),
          });
          movimentosInseridos += 1;
          mudou = true;
        }
        if (mudou) lotesProcessados += 1;
      }
    }

    if (insumoIds.length === 0) {
      avisos.push(`${input.change.produtoNome}: receita sem insumos para backfill.`);
    }

    return { lotesProcessados, movimentosInseridos, avisos };
  }

  private async applyReconciliar(
    change: ProdutividadeConsumoChange,
    loteIds: string[],
  ): Promise<ConsumoProdutividadeBackfillResult> {
    let lotesProcessados = 0;
    let movimentosInseridos = 0;
    const avisos: string[] = [];

    if (change.tipo === 'embalagem' || change.tipo === 'caixa') {
      const lotes = await this.loteRepository.loadEmbalagemLotes(loteIds);
      for (const lote of lotes) {
        const result = await this.embalagemService.sincronizar(lote);
        lotesProcessados += 1;
        if (result.aplicado) movimentosInseridos += 1;
        avisos.push(...result.avisos);
      }
      return { lotesProcessados, movimentosInseridos, avisos };
    }

    if (change.tipo === 'massa') {
      const pairs = await this.loteRepository.loadFermentacaoLotesWithOrdens(loteIds);
      for (const { lote, ordem } of pairs) {
        const result = await this.fermentacaoService.sincronizarFermentacaoLote(lote, ordem);
        lotesProcessados += 1;
        if (result.aplicado) movimentosInseridos += 1;
        avisos.push(...result.avisos);
      }
      return { lotesProcessados, movimentosInseridos, avisos };
    }

    const pairs = await this.loteRepository.loadFornoLotesWithOrdens(loteIds);
    for (const { lote, ordem } of pairs) {
      const result = await this.fornoService.sincronizar(lote, ordem);
      lotesProcessados += 1;
      if (result.aplicado) movimentosInseridos += 1;
      avisos.push(...result.avisos);
    }
    return { lotesProcessados, movimentosInseridos, avisos };
  }
}

export const insumoConsumoProdutividadeBackfillService =
  new InsumoConsumoProdutividadeBackfillService();
