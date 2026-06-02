import type { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/database';

import { isVinculoReceitaMassaAtiva } from './receita-massa-eligibility';

export type ReceitaMassaResolved = {
  receita_id: string;
  quantidade_por_produto: number;
  receita_nome: string | null;
  receita_codigo: string | null;
};

export type ReceitaMassaListItem = {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: string;
};

type ProdutoReceitaLink = {
  receita_id: string;
  quantidade_por_produto: number;
};

type ReceitaMeta = {
  tipo?: string;
  ativo?: boolean;
  nome?: string;
  codigo?: string | null;
};

async function loadProdutoReceitaLinks(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<{ links: ProdutoReceitaLink[]; error: unknown | null }> {
  /** Sem `tipo` no select: coluna pode não existir (REMOVER_TIPO_PRODUTO_RECEITAS) — tipo vem de `receitas`. */
  const { data, error } = await supabase
    .from('produto_receitas')
    .select('receita_id, quantidade_por_produto')
    .eq('produto_id', produtoId)
    .eq('ativo', true);

  if (error) {
    return { links: [], error };
  }

  return { links: (data ?? []) as ProdutoReceitaLink[], error: null };
}

async function loadReceitasMeta(
  supabase: SupabaseClient<Database>,
  receitaIds: string[],
): Promise<Map<string, ReceitaMeta>> {
  const recMeta = new Map<string, ReceitaMeta>();
  if (receitaIds.length === 0) return recMeta;

  const { data: recRows, error: recErr } = await supabase
    .from('receitas')
    .select('id, tipo, ativo, nome, codigo')
    .in('id', receitaIds);

  if (recErr) {
    console.error('Erro ao buscar receitas (meta massa):', recErr);
    return recMeta;
  }

  for (const row of recRows ?? []) {
    const r = row as {
      id: string;
      tipo?: string;
      ativo?: boolean | null;
      nome?: string;
      codigo?: string | null;
    };
    recMeta.set(String(r.id).trim(), {
      tipo: r.tipo,
      ativo: r.ativo === null || r.ativo === undefined ? undefined : Boolean(r.ativo),
      nome: r.nome,
      codigo: r.codigo ?? null,
    });
  }

  return recMeta;
}

function pickMassaLink(
  links: ProdutoReceitaLink[],
  recMeta: Map<string, ReceitaMeta>,
): ProdutoReceitaLink | undefined {
  const eligible = links.find((pr) => {
    const rid = String(pr.receita_id ?? '').trim();
    const meta = rid ? recMeta.get(rid) : undefined;
    return isVinculoReceitaMassaAtiva({
      receitas: meta ? { tipo: meta.tipo, ativo: meta.ativo } : null,
    });
  });
  if (eligible) return eligible;

  const byReceitaTipo = links.find((pr) => {
    const rid = String(pr.receita_id ?? '').trim();
    const meta = rid ? recMeta.get(rid) : undefined;
    return meta && String(meta.tipo ?? '').toLowerCase() === 'massa';
  });
  if (byReceitaTipo) return byReceitaTipo;

  return links[0];
}

/**
 * Resolve a receita de massa principal do produto (cadastro ativo).
 */
export async function resolveReceitaMassaForProduto(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<ReceitaMassaResolved | null> {
  const { links, error } = await loadProdutoReceitaLinks(supabase, produtoId);
  if (error) {
    console.error('Erro ao buscar vínculos produto↔receita:', error);
    return null;
  }
  if (links.length === 0) return null;

  const linkIds = [
    ...new Set(links.map((p) => String(p.receita_id ?? '').trim()).filter(Boolean)),
  ];
  const recMeta = await loadReceitasMeta(supabase, linkIds);
  const chosen = pickMassaLink(links, recMeta);
  if (!chosen) return null;

  const rid = String(chosen.receita_id ?? '').trim();
  const meta = rid ? recMeta.get(rid) : undefined;
  if (!rid) {
    return {
      receita_id: '',
      quantidade_por_produto: chosen.quantidade_por_produto,
      receita_nome: null,
      receita_codigo: null,
    };
  }

  return {
    receita_id: rid,
    quantidade_por_produto: chosen.quantidade_por_produto,
    receita_nome: meta?.nome ?? null,
    receita_codigo: meta?.codigo ?? null,
  };
}

/**
 * Lista receitas de massa vinculadas ao produto (para seleção na etapa massa).
 */
export async function listReceitasMassaForProduto(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<ReceitaMassaListItem[]> {
  const { links, error } = await loadProdutoReceitaLinks(supabase, produtoId);
  if (error) {
    throw new Error(
      `Erro ao buscar vínculos produto↔receita: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (links.length === 0) return [];

  const linkIds = [
    ...new Set(links.map((p) => String(p.receita_id ?? '').trim()).filter(Boolean)),
  ];
  const recMeta = await loadReceitasMeta(supabase, linkIds);

  const receitasMassa: ReceitaMassaListItem[] = [];
  for (const pr of links) {
    const rid = String(pr.receita_id ?? '').trim();
    const meta = rid ? recMeta.get(rid) : undefined;
    if (
      !isVinculoReceitaMassaAtiva({
        receitas: meta
          ? { tipo: meta.tipo, ativo: meta.ativo }
          : null,
      })
    ) {
      continue;
    }
    if (meta?.nome != null && rid) {
      receitasMassa.push({
        id: rid,
        nome: meta.nome,
        codigo: meta.codigo ?? null,
        tipo: meta.tipo ?? 'massa',
      });
    }
  }

  if (receitasMassa.length === 0 && links.length > 0) {
    for (const pr of links) {
      const rid = String(pr.receita_id ?? '').trim();
      const meta = rid ? recMeta.get(rid) : undefined;
      if (meta && String(meta.tipo ?? '').toLowerCase() === 'massa' && meta.nome) {
        receitasMassa.push({
          id: rid,
          nome: meta.nome,
          codigo: meta.codigo ?? null,
          tipo: meta.tipo ?? 'massa',
        });
      }
    }
  }

  if (receitasMassa.length === 0 && links.length > 0) {
    const rid0 = String(links[0]!.receita_id ?? '').trim();
    const meta0 = rid0 ? recMeta.get(rid0) : undefined;
    if (rid0 && meta0?.nome) {
      receitasMassa.push({
        id: rid0,
        nome: meta0.nome,
        codigo: meta0.codigo ?? null,
        tipo: meta0.tipo ?? 'massa',
      });
    }
  }

  return receitasMassa;
}
