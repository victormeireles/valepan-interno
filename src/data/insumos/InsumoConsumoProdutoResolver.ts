import { SupabaseClient } from '@supabase/supabase-js';
import type { ConsumoMovimentoWithInsumo } from './InsumoConsumoRepository';

type LoteProdutoDetalhe = {
  produtoId: string;
  produtoNome: string;
};

export class InsumoConsumoProdutoResolver {
  constructor(private readonly db: SupabaseClient) {}

  async resolveByMovimentos(
    rows: ConsumoMovimentoWithInsumo[],
  ): Promise<Map<string, LoteProdutoDetalhe>> {
    const result = new Map<string, LoteProdutoDetalhe>();
    await Promise.all([
      this.fetchProdutosByEtapaLote(
        'fermentacao_lotes',
        rows.map((row) => row.fermentacao_lote_id).filter(Boolean) as string[],
        result,
      ),
      this.fetchProdutosByEtapaLote(
        'forno_lotes',
        rows.map((row) => row.forno_lote_id).filter(Boolean) as string[],
        result,
      ),
      this.fetchProdutosByEmbalagemLote(
        rows.map((row) => row.embalagem_lote_id).filter(Boolean) as string[],
        result,
      ),
    ]);
    return result;
  }

  resolveProdutoDetalhe(
    row: ConsumoMovimentoWithInsumo,
    produtosByLote: Map<string, LoteProdutoDetalhe>,
  ): LoteProdutoDetalhe | null {
    const loteId =
      row.fermentacao_lote_id ?? row.forno_lote_id ?? row.embalagem_lote_id ?? null;
    return loteId ? produtosByLote.get(loteId) ?? null : null;
  }

  private async fetchProdutosByEtapaLote(
    tableName: 'fermentacao_lotes' | 'forno_lotes',
    loteIds: string[],
    result: Map<string, LoteProdutoDetalhe>,
  ): Promise<void> {
    const ids = [...new Set(loteIds)];
    if (ids.length === 0) return;

    const { data, error } = await this.db
      .from(tableName)
      .select('id, ordens_producao(produto_id, produtos(nome))')
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao buscar produtos dos lotes: ${error.message}`);
    }

    for (const row of this.castEtapaRows(data)) {
      const ordem = Array.isArray(row.ordens_producao)
        ? row.ordens_producao[0]
        : row.ordens_producao;
      if (!ordem) continue;
      const produto = Array.isArray(ordem.produtos) ? ordem.produtos[0] : ordem.produtos;
      result.set(row.id, {
        produtoId: ordem.produto_id,
        produtoNome: produto?.nome ?? 'Produto não identificado',
      });
    }
  }

  private async fetchProdutosByEmbalagemLote(
    loteIds: string[],
    result: Map<string, LoteProdutoDetalhe>,
  ): Promise<void> {
    const ids = [...new Set(loteIds)];
    if (ids.length === 0) return;

    const { data, error } = await this.db
      .from('embalagem_lotes')
      .select('id, produto_id, produtos(nome)')
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao buscar produtos dos lotes de embalagem: ${error.message}`);
    }

    for (const row of this.castEmbalagemRows(data)) {
      const produto = Array.isArray(row.produtos) ? row.produtos[0] : row.produtos;
      result.set(row.id, {
        produtoId: row.produto_id,
        produtoNome: produto?.nome ?? 'Produto não identificado',
      });
    }
  }

  private castEtapaRows(data: unknown) {
    return (data ?? []) as Array<{
      id: string;
      ordens_producao:
        | { produto_id: string; produtos: { nome: string } | { nome: string }[] | null }
        | { produto_id: string; produtos: { nome: string } | { nome: string }[] | null }[]
        | null;
    }>;
  }

  private castEmbalagemRows(data: unknown) {
    return (data ?? []) as Array<{
      id: string;
      produto_id: string;
      produtos: { nome: string } | { nome: string }[] | null;
    }>;
  }
}
