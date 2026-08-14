import { assadeiraResolver } from '@/domain/assadeiras/assadeira-resolver';
import { idListChunker } from '@/data/insumos/IdListChunker';
import {
  insumoConsumoProdutividadeLoteRepository,
  InsumoConsumoProdutividadeLoteRepository,
} from '@/data/insumos/InsumoConsumoProdutividadeLoteRepository';
import {
  insumoEstoqueRepository,
  InsumoEstoqueRepository,
} from '@/data/insumos/InsumoEstoqueRepository';
import {
  insumoReceitaMassaRepository,
  InsumoReceitaMassaRepository,
} from '@/data/insumos/InsumoReceitaMassaRepository';
import { formatarObservacaoConsumoForno } from '@/domain/insumos/insumo-consumo-observacao';
import { calcularConsumoMultiReceitas } from '@/domain/insumos/insumo-consumo-producao-multi-calculator';
import { InsumoConsumoReconcileDeltaCalculator } from '@/domain/insumos/insumo-consumo-reconcile-delta-calculator';
import type { InsumoReceitaTipoContexto } from '@/domain/insumos/insumo-consumo-producao-types';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';
import type { FornoLoteRecord } from '@/domain/types/forno-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import {
  insumoEstoqueService,
  InsumoEstoqueService,
} from '@/lib/services/insumo-estoque-service';
import type { ConsumoProdutividadeBackfillResult } from '@/lib/services/insumo-consumo-produtividade-backfill-service';

const TIPOS_FORNO: TipoReceita[] = ['brilho', 'confeito'];
const COLUNA = 'forno_lote_id' as const;
const ORIGEM = 'producao_forno' as const;

export type FornoBackfillProdutoAlvo = {
  produtoId: string;
  produtoNome: string;
};

function resolverUnidadesProduzidas(
  lote: FornoLoteRecord,
  ordem: OrdemProducaoRecord,
  unidadesPorAssadeira: number | null,
): number | null {
  const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
  if (modo === 'assadeiras') {
    if (!unidadesPorAssadeira || unidadesPorAssadeira <= 0) return null;
    if (lote.assadeiras <= 0) return null;
    return lote.assadeiras * unidadesPorAssadeira;
  }
  if (lote.unidades <= 0) return null;
  return lote.unidades;
}

/**
 * Reconcilia consumo de forno (brilho/confeito) em batch, com created_at = produzido_em.
 */
export class InsumoConsumoFornoBackfillBatchService {
  constructor(
    private readonly loteRepository: InsumoConsumoProdutividadeLoteRepository =
      insumoConsumoProdutividadeLoteRepository,
    private readonly receitaRepository: InsumoReceitaMassaRepository =
      insumoReceitaMassaRepository,
    private readonly estoqueRepository: InsumoEstoqueRepository = insumoEstoqueRepository,
    private readonly estoqueService: InsumoEstoqueService = insumoEstoqueService,
  ) {}

  async applyPorProdutos(
    produtos: FornoBackfillProdutoAlvo[],
    desdeIso?: string | null,
  ): Promise<ConsumoProdutividadeBackfillResult> {
    let lotesProcessados = 0;
    let movimentosInseridos = 0;
    const avisos: string[] = [];

    for (const produto of produtos) {
      const result = await this.applyProduto(produto, desdeIso);
      lotesProcessados += result.lotesProcessados;
      movimentosInseridos += result.movimentosInseridos;
      avisos.push(...result.avisos);
    }

    return { lotesProcessados, movimentosInseridos, avisos };
  }

  async applyPorInsumo(
    insumoId: string,
    desdeIso?: string | null,
  ): Promise<ConsumoProdutividadeBackfillResult & { produtos: number }> {
    const produtos = await this.loteRepository.listProdutosFornoPorInsumo(insumoId);
    const unicos = new Map(
      produtos.map((p) => [p.produtoId, { produtoId: p.produtoId, produtoNome: p.produtoNome }]),
    );
    const result = await this.applyPorProdutos([...unicos.values()], desdeIso);
    return { ...result, produtos: unicos.size };
  }

  private async applyProduto(
    produto: FornoBackfillProdutoAlvo,
    desdeIso?: string | null,
  ): Promise<ConsumoProdutividadeBackfillResult> {
    const contextoBase = await this.receitaRepository.loadContextoProducaoPorProduto(
      produto.produtoId,
      TIPOS_FORNO,
    );
    if (!contextoBase) {
      return {
        lotesProcessados: 0,
        movimentosInseridos: 0,
        avisos: [`${produto.produtoNome}: sem receita de brilho/confeito`],
      };
    }

    const loteRefs = await this.loteRepository.listLoteIdsByProduto({
      produtoId: produto.produtoId,
      coluna: COLUNA,
      desdeIso,
    });
    if (loteRefs.length === 0) {
      return { lotesProcessados: 0, movimentosInseridos: 0, avisos: [] };
    }

    const vinculosAssadeira = await assadeiraResolver.resolveForProduto(produto.produtoId);
    const unPorAssadeira = new Map(
      vinculosAssadeira.map((v) => [v.assadeira_id, v.unidades_efetivas]),
    );
    const fallbackUn = vinculosAssadeira[0]?.unidades_efetivas ?? null;

    let lotesProcessados = 0;
    let movimentosInseridos = 0;
    const avisos: string[] = [];

    for (const chunk of idListChunker.chunk(loteRefs.map((l) => l.id))) {
      const [pares, deltasPorLote] = await Promise.all([
        this.loteRepository.loadFornoLotesWithOrdens(chunk),
        this.estoqueRepository.sumDeltasGroupedByLoteInsumo(COLUNA, chunk),
      ]);

      const pendentes = this.buildDeltas({
        pares,
        deltasPorLote,
        receitas: contextoBase.receitas,
        produtoNome: contextoBase.produtoNome,
        unPorAssadeira,
        fallbackUn,
        avisos,
      });

      lotesProcessados += pares.length;
      if (pendentes.length > 0) {
        movimentosInseridos += await this.estoqueService.aplicarDeltasEmLote(pendentes);
      }
    }

    return { lotesProcessados, movimentosInseridos, avisos };
  }

  private buildDeltas(input: {
    pares: Array<{ lote: FornoLoteRecord; ordem: OrdemProducaoRecord }>;
    deltasPorLote: Map<string, Map<string, number>>;
    receitas: InsumoReceitaTipoContexto[];
    produtoNome: string;
    unPorAssadeira: Map<string, number>;
    fallbackUn: number | null;
    avisos: string[];
  }) {
    const pendentes: Array<{
      insumoId: string;
      delta: number;
      origem: typeof ORIGEM;
      fornoLoteId: string;
      observacao: string;
      createdAt: string;
    }> = [];

    for (const { lote, ordem } of input.pares) {
      const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
      const unidadesPorAssadeira =
        modo === 'assadeiras'
          ? (input.unPorAssadeira.get(ordem.assadeiraId ?? '') ?? input.fallbackUn)
          : null;
      const unidadesProduzidas = resolverUnidadesProduzidas(
        lote,
        ordem,
        unidadesPorAssadeira,
      );
      const calculo = calcularConsumoMultiReceitas({
        unidadesProduzidas: unidadesProduzidas ?? 0,
        receitas: input.receitas,
      });
      input.avisos.push(...calculo.avisos);
      if (calculo.consumos.length === 0) continue;

      const deltasAtuais = input.deltasPorLote.get(lote.id) ?? new Map<string, number>();
      const reconciles = InsumoConsumoReconcileDeltaCalculator.calcular(
        calculo.consumos,
        deltasAtuais,
      );
      if (reconciles.length === 0) continue;

      const observacao = formatarObservacaoConsumoForno({
        produtoNome: input.produtoNome,
        modo,
        lote: { assadeiras: lote.assadeiras, unidades: lote.unidades },
        unidadesPorAssadeira,
        loteId: lote.id,
      });

      for (const item of reconciles) {
        pendentes.push({
          insumoId: item.insumoId,
          delta: item.delta,
          origem: ORIGEM,
          fornoLoteId: lote.id,
          observacao,
          createdAt: lote.produzidoEm,
        });
      }
    }

    return pendentes;
  }
}

export const insumoConsumoFornoBackfillBatchService =
  new InsumoConsumoFornoBackfillBatchService();
