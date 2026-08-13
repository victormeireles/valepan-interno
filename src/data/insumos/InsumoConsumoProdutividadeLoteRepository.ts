import { idListChunker } from '@/data/insumos/IdListChunker';
import type { InsumoMovimentoLoteColuna } from '@/data/insumos/InsumoEstoqueRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { FornoLoteRecord } from '@/domain/types/forno-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type LoteIdComData = {
  id: string;
  produzidoEm: string;
};

export class InsumoConsumoProdutividadeLoteRepository {
  constructor(
    private readonly db: SupabaseClient<Database> =
      supabaseClientFactory.createServiceRoleClient(),
  ) {}

  async listLoteIdsByProduto(input: {
    produtoId: string;
    coluna: InsumoMovimentoLoteColuna;
    desdeIso?: string | null;
  }): Promise<LoteIdComData[]> {
    if (input.coluna === 'embalagem_lote_id') {
      return this.listEmbalagemLoteIds(input.produtoId, input.desdeIso);
    }
    return this.listEtapaLoteIdsViaOrdem(input.produtoId, input.coluna, input.desdeIso);
  }

  async listReceitaInsumoIds(receitaId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('receita_ingredientes')
      .select('insumo_id')
      .eq('receita_id', receitaId);

    if (error) {
      throw new Error(`Erro ao listar insumos da receita: ${error.message}`);
    }

    return [...new Set((data ?? []).map((row) => row.insumo_id as string))];
  }

  async sumDeltasByLotesInsumos(input: {
    coluna: InsumoMovimentoLoteColuna;
    loteIds: string[];
    insumoIds: string[];
    excluirBackfill?: boolean;
  }): Promise<Map<string, number>> {
    const totais = new Map<string, number>();
    if (input.loteIds.length === 0 || input.insumoIds.length === 0) return totais;

    for (const loteChunk of idListChunker.chunk(input.loteIds)) {
      for (const insumoChunk of idListChunker.chunk(input.insumoIds)) {
        const query = this.db
          .from('insumo_movimentos')
          .select('insumo_id, delta_quantidade, observacao')
          .in(input.coluna, loteChunk)
          .in('insumo_id', insumoChunk);

        const { data, error } = await query;

        if (error) {
          throw new Error(`Erro ao agregar consumo histórico: ${error.message}`);
        }

        for (const row of data ?? []) {
          if (
            input.excluirBackfill &&
            typeof row.observacao === 'string' &&
            row.observacao.startsWith('Backfill produtividade')
          ) {
            continue;
          }
          const insumoId = row.insumo_id as string;
          totais.set(
            insumoId,
            (totais.get(insumoId) ?? 0) + Number(row.delta_quantidade),
          );
        }
      }
    }

    return totais;
  }

  async loadEmbalagemLotes(ids: string[]): Promise<EmbalagemLoteRecord[]> {
    const rows: EmbalagemLoteRecord[] = [];
    for (const chunk of idListChunker.chunk(ids)) {
      const loaded = await Promise.all(
        chunk.map((id) => embalagemLoteRepository.findById(id)),
      );
      for (const lote of loaded) {
        if (lote) rows.push(lote);
      }
    }
    return rows;
  }

  async loadFermentacaoLotesWithOrdens(ids: string[]): Promise<
    Array<{ lote: FermentacaoLoteRecord; ordem: OrdemProducaoRecord }>
  > {
    return this.loadEtapaWithOrdens(ids, (id) => fermentacaoLoteRepository.findById(id));
  }

  async loadFornoLotesWithOrdens(ids: string[]): Promise<
    Array<{ lote: FornoLoteRecord; ordem: OrdemProducaoRecord }>
  > {
    return this.loadEtapaWithOrdens(ids, (id) => fornoLoteRepository.findById(id));
  }

  private async loadEtapaWithOrdens<T extends { ordemProducaoId: string }>(
    ids: string[],
    findLote: (id: string) => Promise<T | null>,
  ): Promise<Array<{ lote: T; ordem: OrdemProducaoRecord }>> {
    const lotes: T[] = [];
    for (const chunk of idListChunker.chunk(ids)) {
      const loaded = await Promise.all(chunk.map((id) => findLote(id)));
      for (const lote of loaded) {
        if (lote) lotes.push(lote);
      }
    }

    const ordemIds = [...new Set(lotes.map((lote) => lote.ordemProducaoId))];
    const ordens = await ordemProducaoRepository.findByIds(ordemIds);
    const ordemById = new Map(ordens.map((ordem) => [ordem.id, ordem]));

    const result: Array<{ lote: T; ordem: OrdemProducaoRecord }> = [];
    for (const lote of lotes) {
      const ordem = ordemById.get(lote.ordemProducaoId);
      if (ordem) result.push({ lote, ordem });
    }
    return result;
  }

  private async listEmbalagemLoteIds(
    produtoId: string,
    desdeIso?: string | null,
  ): Promise<LoteIdComData[]> {
    let query = this.db
      .from('embalagem_lotes')
      .select('id, produzido_em')
      .eq('produto_id', produtoId)
      .order('produzido_em', { ascending: true });

    if (desdeIso) {
      query = query.gte('produzido_em', `${desdeIso}T00:00:00.000Z`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Erro ao listar lotes de embalagem: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      produzidoEm: row.produzido_em as string,
    }));
  }

  private async listEtapaLoteIdsViaOrdem(
    produtoId: string,
    coluna: 'fermentacao_lote_id' | 'forno_lote_id',
    desdeIso?: string | null,
  ): Promise<LoteIdComData[]> {
    const table =
      coluna === 'fermentacao_lote_id' ? 'fermentacao_lotes' : 'forno_lotes';

    const { data: ordens, error: ordensError } = await this.db
      .from('ordens_producao')
      .select('id')
      .eq('produto_id', produtoId);

    if (ordensError) {
      throw new Error(`Erro ao listar ordens do produto: ${ordensError.message}`);
    }

    const ordemIds = (ordens ?? []).map((row) => row.id as string);
    if (ordemIds.length === 0) return [];

    const result: LoteIdComData[] = [];
    for (const chunk of idListChunker.chunk(ordemIds)) {
      let query = this.db
        .from(table)
        .select('id, produzido_em')
        .in('ordem_producao_id', chunk)
        .order('produzido_em', { ascending: true });

      if (desdeIso) {
        query = query.gte('produzido_em', `${desdeIso}T00:00:00.000Z`);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Erro ao listar lotes da etapa: ${error.message}`);
      }

      for (const row of data ?? []) {
        result.push({
          id: row.id as string,
          produzidoEm: row.produzido_em as string,
        });
      }
    }

    return result;
  }
}

export const insumoConsumoProdutividadeLoteRepository =
  new InsumoConsumoProdutividadeLoteRepository();
