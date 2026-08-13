import { SupabaseClient } from '@supabase/supabase-js';
import {
  insumoConsumoAgregadoMapper,
} from '@/domain/insumos/insumo-consumo-agregado-mapper';
import type {
  InsumoConsumoPeriodo,
} from '@/domain/insumos/insumo-consumo-semanal-periodo';
import { insumoConsumoSemanalPeriodoBuilder } from '@/domain/insumos/insumo-consumo-semanal-periodo';
import {
  insumoConsumoSemanalAggregator,
  type InsumoConsumoReceitaDetalhe,
  type InsumoConsumoSemanalItem,
} from '@/domain/insumos/insumo-consumo-semanal-aggregator';
import type { InsumoMovimentoOrigem } from '@/domain/types/insumo-estoque';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';
import { InsumoConsumoProdutoResolver } from './InsumoConsumoProdutoResolver';

export type ConsumoMovimentoWithInsumo = {
  insumo_id: string;
  created_at: string;
  delta_quantidade: number;
  origem: InsumoMovimentoOrigem;
  fermentacao_lote_id: string | null;
  forno_lote_id: string | null;
  embalagem_lote_id: string | null;
  insumos: {
    nome: string;
    unidades: { nome_resumido: string } | { nome_resumido: string }[] | null;
  } | null;
};

type ConsumoAgregadoRpcRow = {
  insumo_id: string;
  nome: string;
  unidade_resumida: string;
  coluna_inicio: string;
  consumo: number | string;
};

export class InsumoConsumoRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> =
      supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async listConsumoSemanal(
    periodo: InsumoConsumoPeriodo,
  ): Promise<InsumoConsumoSemanalItem[]> {
    const { startIso, endIso } = insumoConsumoSemanalPeriodoBuilder.getSaoPauloDayRange(
      periodo.dataInicio,
      periodo.dataFim,
    );

    const { data, error } = await this.db.rpc('list_insumo_consumo_agregado', {
      p_start: startIso,
      p_end: endIso,
      p_visualizacao: periodo.visualizacao,
    });

    if (error) {
      throw new Error(`Erro ao listar consumo de insumos: ${error.message}`);
    }

    const rows = (data ?? []) as ConsumoAgregadoRpcRow[];
    return insumoConsumoAgregadoMapper.toSemanalItems(
      periodo,
      rows.map((row) => ({
        insumoId: row.insumo_id,
        nome: row.nome ?? '',
        unidadeResumida: row.unidade_resumida ?? '',
        colunaInicio: String(row.coluna_inicio).slice(0, 10),
        consumo: Number(row.consumo),
      })),
    );
  }

  async listConsumoDetalhesPorProduto(input: {
    insumoId: string;
    periodo: InsumoConsumoPeriodo;
  }): Promise<InsumoConsumoReceitaDetalhe[]> {
    const rows = await this.fetchConsumoMovimentosForPeriodo(input.periodo, input.insumoId);
    const produtoResolver = new InsumoConsumoProdutoResolver(this.db);
    const produtosByLote = await produtoResolver.resolveByMovimentos(rows);

    const item = insumoConsumoSemanalAggregator.aggregate(
      input.periodo,
      rows.map((row) => {
        const detalhe = produtoResolver.resolveProdutoDetalhe(row, produtosByLote);

        return {
          insumoId: row.insumo_id,
          nome: row.insumos?.nome ?? '',
          unidadeResumida: '',
          dataMovimento: insumoConsumoSemanalPeriodoBuilder.getSaoPauloDateFromTimestamp(
            row.created_at,
          ),
          deltaQuantidade: Number(row.delta_quantidade),
          origem: row.origem,
          fermentacaoLoteId: row.fermentacao_lote_id,
          fornoLoteId: row.forno_lote_id,
          embalagemLoteId: row.embalagem_lote_id,
          receitaId: detalhe?.produtoId ?? 'produto-nao-identificado',
          receitaNome: detalhe?.produtoNome ?? 'Produto não identificado',
        };
      }),
    )[0];

    return item?.receitas ?? [];
  }

  private async fetchConsumoMovimentosForPeriodo(
    periodo: InsumoConsumoPeriodo,
    insumoId?: string,
  ): Promise<ConsumoMovimentoWithInsumo[]> {
    const { startIso, endIso } = insumoConsumoSemanalPeriodoBuilder.getSaoPauloDayRange(
      periodo.dataInicio,
      periodo.dataFim,
    );
    return this.fetchConsumoMovimentos(startIso, endIso, insumoId);
  }

  private async fetchConsumoMovimentos(
    startIso: string,
    endIso: string,
    insumoId?: string,
  ): Promise<ConsumoMovimentoWithInsumo[]> {
    const pageSize = 1000;
    const rows: ConsumoMovimentoWithInsumo[] = [];

    for (let offset = 0; ; offset += pageSize) {
      let query = this.db
        .from('insumo_movimentos')
        .select(
          'insumo_id, created_at, delta_quantidade, origem, fermentacao_lote_id, forno_lote_id, embalagem_lote_id, insumos(nome, unidades(nome_resumido))',
        )
        .in('origem', ['producao_fermentacao', 'producao_forno', 'producao_embalagem'])
        .or(
          [
            'and(origem.eq.producao_fermentacao,fermentacao_lote_id.not.is.null)',
            'and(origem.eq.producao_forno,forno_lote_id.not.is.null)',
            'and(origem.eq.producao_embalagem,embalagem_lote_id.not.is.null)',
          ].join(','),
        )
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (insumoId) {
        query = query.eq('insumo_id', insumoId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Erro ao listar consumo de insumos: ${error.message}`);
      }

      rows.push(...((data ?? []) as unknown as ConsumoMovimentoWithInsumo[]));
      if ((data ?? []).length < pageSize) return rows;
    }
  }
}

export const insumoConsumoRepository = new InsumoConsumoRepository();
