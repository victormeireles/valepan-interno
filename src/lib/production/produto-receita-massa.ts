import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isVinculoReceitaMassaAtiva } from '@/lib/utils/receita-massa-eligibility';

type InternoClient = SupabaseClient<Database>;

export type ReceitaMassaAtivaProduto = {
  receita_id: string;
  quantidade_por_produto: number;
};

export type ProdutoReceitaMassaLinkRow = {
  produto_id: string;
  quantidade_por_produto: number;
  tipo?: string | null;
  receita_id: string;
  receitas?: { tipo?: string | null; ativo?: boolean | null } | null;
};

/**
 * Vínculos produto↔receita + metadados de `receitas` sem embed PostgREST
 * (evita PGRST200 quando o hint de FK não está no schema cache).
 */
export async function loadProdutoReceitasMassaLinkRows(
  supabase: InternoClient,
  produtoIds: string[],
): Promise<{ rows: ProdutoReceitaMassaLinkRow[]; error: string | null }> {
  if (produtoIds.length === 0) return { rows: [], error: null };

  const { data: linksRows, error: linksErr } = await supabase
    .from('produto_receitas')
    .select('produto_id, quantidade_por_produto, receita_id')
    .in('produto_id', produtoIds)
    .eq('ativo', true);

  if (linksErr) {
    return { rows: [], error: linksErr.message };
  }

  const receitaIds = [
    ...new Set(
      (linksRows ?? [])
        .map((r) => String((r as { receita_id?: string | null }).receita_id ?? '').trim())
        .filter(Boolean),
    ),
  ];

  if (receitaIds.length === 0) {
    return { rows: [], error: null };
  }

  const { data: recRows, error: recErr } = await supabase
    .from('receitas')
    .select('id, tipo, ativo')
    .in('id', receitaIds);

  if (recErr) {
    return { rows: [], error: recErr.message };
  }

  const receitaById = new Map<string, { tipo?: string | null; ativo?: boolean | null }>();
  for (const row of recRows ?? []) {
    const r = row as { id: string; tipo?: string | null; ativo?: boolean | null };
    receitaById.set(r.id, { tipo: r.tipo, ativo: r.ativo });
  }

  const rows: ProdutoReceitaMassaLinkRow[] = (linksRows ?? []).map((link) => {
    const l = link as {
      produto_id: string;
      quantidade_por_produto: number;
      receita_id: string;
    };
    return {
      produto_id: l.produto_id,
      quantidade_por_produto: Number(l.quantidade_por_produto),
      receita_id: l.receita_id,
      receitas: receitaById.get(l.receita_id) ?? null,
    };
  });

  return { rows, error: null };
}

/** Primeira receita de massa ativa do produto (para sincronizar pré-requisitos, massa, etc.). */
export async function findReceitaMassaAtivaParaProduto(
  supabase: InternoClient,
  produtoId: string,
): Promise<ReceitaMassaAtivaProduto | null> {
  const pid = produtoId.trim();
  if (!pid) return null;

  const { rows, error } = await loadProdutoReceitasMassaLinkRows(supabase, [pid]);
  if (error) return null;

  for (const pr of rows) {
    if (!isVinculoReceitaMassaAtiva(pr)) continue;
    const rid = String(pr.receita_id ?? '').trim();
    const qpp = Number(pr.quantidade_por_produto);
    if (rid && Number.isFinite(qpp) && qpp > 0) {
      return { receita_id: rid, quantidade_por_produto: qpp };
    }
  }
  return null;
}
