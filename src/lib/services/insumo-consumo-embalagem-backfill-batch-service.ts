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
import { derivarDimensoesEmbalagem } from '@/domain/insumos/insumo-consumo-embalagem-dimensoes';
import { formatarObservacaoConsumoEmbalagem } from '@/domain/insumos/insumo-consumo-observacao';
import { calcularConsumoMultiReceitas } from '@/domain/insumos/insumo-consumo-producao-multi-calculator';
import { InsumoConsumoReconcileDeltaCalculator } from '@/domain/insumos/insumo-consumo-reconcile-delta-calculator';
import type { InsumoReceitaTipoContexto } from '@/domain/insumos/insumo-consumo-producao-types';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import {
  insumoEstoqueService,
  InsumoEstoqueService,
} from '@/lib/services/insumo-estoque-service';
import type { ConsumoProdutividadeBackfillResult } from '@/lib/services/insumo-consumo-produtividade-backfill-service';

const TIPOS_EMBALAGEM: TipoReceita[] = ['antimofo', 'embalagem', 'caixa'];
const ORIGEM = 'producao_embalagem' as const;
const COLUNA = 'embalagem_lote_id' as const;

export type EmbalagemBackfillProdutoAlvo = {
  produtoId: string;
  produtoNome: string;
};

/**
 * Reconcilia consumo de embalagem em batch: 1 contexto por produto,
 * agregação de deltas por chunk, inserts/saldos em lote.
 * Movimentos usam `produzido_em` do lote (grade diária correta).
 */
export class InsumoConsumoEmbalagemBackfillBatchService {
  constructor(
    private readonly loteRepository: InsumoConsumoProdutividadeLoteRepository =
      insumoConsumoProdutividadeLoteRepository,
    private readonly receitaRepository: InsumoReceitaMassaRepository =
      insumoReceitaMassaRepository,
    private readonly estoqueRepository: InsumoEstoqueRepository = insumoEstoqueRepository,
    private readonly estoqueService: InsumoEstoqueService = insumoEstoqueService,
  ) {}

  async applyPorProdutos(
    produtos: EmbalagemBackfillProdutoAlvo[],
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

  async applyPorInsumoEmbalagem(
    insumoId: string,
    desdeIso?: string | null,
  ): Promise<ConsumoProdutividadeBackfillResult & { produtos: number }> {
    const produtos =
      await this.loteRepository.listProdutosEmbalagemPorInsumo(insumoId);
    const result = await this.applyPorProdutos(
      produtos.map((p) => ({
        produtoId: p.produtoId,
        produtoNome: p.produtoNome,
      })),
      desdeIso,
    );
    return { ...result, produtos: produtos.length };
  }

  private async applyProduto(
    produto: EmbalagemBackfillProdutoAlvo,
    desdeIso?: string | null,
  ): Promise<ConsumoProdutividadeBackfillResult> {
    const contexto = await this.receitaRepository.loadContextoProducaoPorProduto(
      produto.produtoId,
      TIPOS_EMBALAGEM,
    );
    if (!contexto) {
      return {
        lotesProcessados: 0,
        movimentosInseridos: 0,
        avisos: [`${produto.produtoNome}: sem receita de embalagem vinculada`],
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

    const loteIds = loteRefs.map((lote) => lote.id);
    let lotesProcessados = 0;
    let movimentosInseridos = 0;
    const avisos: string[] = [];

    for (const chunk of idListChunker.chunk(loteIds)) {
      const [lotes, deltasPorLote] = await Promise.all([
        this.loteRepository.loadEmbalagemLotes(chunk),
        this.estoqueRepository.sumDeltasGroupedByLoteInsumo(COLUNA, chunk),
      ]);

      const pendentes = this.buildDeltasParaLotes({
        lotes,
        deltasPorLote,
        contextoReceitas: contexto.receitas,
        produtoNome: contexto.produtoNome,
        avisos,
      });

      lotesProcessados += lotes.length;
      if (pendentes.length > 0) {
        movimentosInseridos += await this.estoqueService.aplicarDeltasEmLote(pendentes);
      }
    }

    return { lotesProcessados, movimentosInseridos, avisos };
  }

  private buildDeltasParaLotes(input: {
    lotes: EmbalagemLoteRecord[];
    deltasPorLote: Map<string, Map<string, number>>;
    contextoReceitas: InsumoReceitaTipoContexto[];
    produtoNome: string;
    avisos: string[];
  }) {
    const pendentes: Array<{
      insumoId: string;
      delta: number;
      origem: typeof ORIGEM;
      embalagemLoteId: string;
      observacao: string;
      createdAt: string;
    }> = [];

    for (const lote of input.lotes) {
      const dimensoes = derivarDimensoesEmbalagem(lote.quantidade, input.contextoReceitas);
      const calculo = calcularConsumoMultiReceitas({
        unidadesProduzidas: dimensoes.unidades ?? 0,
        receitas: input.contextoReceitas,
      });
      input.avisos.push(...dimensoes.avisos, ...calculo.avisos);

      if (calculo.consumos.length === 0) continue;

      const deltasAtuais = input.deltasPorLote.get(lote.id) ?? new Map<string, number>();
      const reconciles = InsumoConsumoReconcileDeltaCalculator.calcular(
        calculo.consumos,
        deltasAtuais,
      );
      if (reconciles.length === 0) continue;

      const observacao = formatarObservacaoConsumoEmbalagem({
        produtoNome: input.produtoNome,
        unidades: dimensoes.unidades,
        pacotes: dimensoes.pacotes,
        loteId: lote.id,
      });

      for (const item of reconciles) {
        pendentes.push({
          insumoId: item.insumoId,
          delta: item.delta,
          origem: ORIGEM,
          embalagemLoteId: lote.id,
          observacao,
          createdAt: lote.produzidoEm,
        });
      }
    }

    return pendentes;
  }
}

export const insumoConsumoEmbalagemBackfillBatchService =
  new InsumoConsumoEmbalagemBackfillBatchService();
