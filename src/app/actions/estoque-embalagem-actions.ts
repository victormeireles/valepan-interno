'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { normalizeToISODate } from '@/lib/utils/date-utils';

export type LinhaEstoqueEmbalagem = {
  produto_id: string;
  codigo: string;
  nome: string;
  tipo_embalagem: string;
  /** Soma das caixas informadas na saída de embalagem (último registro por OP). */
  quantidade_caixas: number;
};

function serializeSupabaseError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: string }).message ?? err);
  }
  return String(err);
}

function supabaseErrText(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const o = err as { message?: string; details?: string; hint?: string; code?: string };
  return [o.message, o.details, o.hint, o.code].filter(Boolean).join(' | ');
}

/** PostgREST/Postgres quando a coluna ainda não foi criada na base (migração pendente). */
function isTipoEmbalagemColumnMissing(err: unknown): boolean {
  const t = supabaseErrText(err).toLowerCase();
  return t.includes('tipo_embalagem') && (t.includes('does not exist') || t.includes('column'));
}

export type GetEstoqueEmbalagemFilter = {
  /**
   * Quando `YYYY-MM-DD`, só entram ordens (não canceladas) com essa data de produção.
   * Quando `null` ou omitido, todas as ordens não canceladas (comportamento acumulado).
   */
  dataProducaoIso?: string | null;
};

/**
 * Resumo de estoque por produto: produtos ativos com tipo de embalagem e total de caixas informadas
 * na saída de embalagem (soma de todos os lançamentos com `caixas_recebidas`). Inclui ordens ainda não
 * marcadas como concluídas no cadastro, desde que as caixas tenham sido salvas.
 */
export async function getEstoqueEmbalagemResumoPorProduto(
  filter?: GetEstoqueEmbalagemFilter,
): Promise<
  { success: true; data: LinhaEstoqueEmbalagem[] } | { success: false; error: string }
> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const dateOnly =
    filter?.dataProducaoIso != null && String(filter.dataProducaoIso).trim() !== ''
      ? String(filter.dataProducaoIso).trim()
      : null;

  let produtos: unknown[] | null = null;
  let tipoEmbalagemDisponivel = true;

  const first = await supabase
    .from('produtos')
    .select('id, codigo, nome, tipo_embalagem, ativo')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (first.error && isTipoEmbalagemColumnMissing(first.error)) {
    tipoEmbalagemDisponivel = false;
    const second = await supabase
      .from('produtos')
      .select('id, codigo, nome, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true });
    if (second.error) {
      return { success: false, error: serializeSupabaseError(second.error) };
    }
    produtos = second.data as unknown[];
  } else if (first.error) {
    return { success: false, error: serializeSupabaseError(first.error) };
  } else {
    produtos = first.data as unknown[];
  }

  const rowsProd = (produtos ?? []) as {
    id: string;
    codigo: string;
    nome: string;
    tipo_embalagem?: string | null;
  }[];

  const tipoPlaceholder = tipoEmbalagemDisponivel ? undefined : '—';

  const { data: ordens, error: oErr } = await supabase
    .from('ordens_producao')
    .select('id, produto_id, data_producao, status')
    .neq('status', 'cancelado');

  if (oErr) {
    return { success: false, error: serializeSupabaseError(oErr) };
  }

  let ordemList = (ordens ?? []) as { id: string; produto_id: string; data_producao?: string | null }[];

  if (dateOnly) {
    ordemList = ordemList.filter((o) => {
      const raw = o.data_producao;
      if (raw == null || String(raw).trim() === '') return false;
      return normalizeToISODate(raw) === dateOnly;
    });
  }

  if (ordemList.length === 0) {
    return {
      success: true,
      data: rowsProd.map((p) => ({
        produto_id: p.id,
        codigo: (p.codigo ?? '').trim() || '—',
        nome: (p.nome ?? '').trim() || '—',
        tipo_embalagem:
          tipoPlaceholder ?? ((p.tipo_embalagem ?? '').trim() || '—'),
        quantidade_caixas: 0,
      })),
    };
  }

  const ordemIds = ordemList.map((o) => o.id);
  const ordemToProduto = new Map(ordemList.map((o) => [o.id, o.produto_id]));

  const { data: logs, error: lErr } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, inicio, dados_qualidade')
    .eq('etapa', 'saida_embalagem')
    .in('ordem_producao_id', ordemIds);

  if (lErr) {
    return { success: false, error: serializeSupabaseError(lErr) };
  }

  type LogRow = { ordem_producao_id: string; dados_qualidade: unknown };
  const sumByProduto = new Map<string, number>();

  for (const raw of logs ?? []) {
    const row = raw as LogRow;
    const oid = String(row.ordem_producao_id ?? '');
    const dq = row.dados_qualidade as { caixas_recebidas?: number } | null;
    const cr = dq?.caixas_recebidas;
    if (cr == null || !Number.isFinite(Number(cr))) continue;
    const caixas = Math.round(Number(cr));
    const pid = ordemToProduto.get(oid);
    if (!pid) continue;
    sumByProduto.set(pid, (sumByProduto.get(pid) ?? 0) + caixas);
  }

  const out = rowsProd.map((p) => ({
    produto_id: p.id,
    codigo: (p.codigo ?? '').trim() || '—',
    nome: (p.nome ?? '').trim() || '—',
    tipo_embalagem: tipoPlaceholder ?? ((p.tipo_embalagem ?? '').trim() || '—'),
    quantidade_caixas: sumByProduto.get(p.id) ?? 0,
  }));

  return { success: true, data: out };
}
