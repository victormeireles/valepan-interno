import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';
import {
  resolveAssadeiraIdForTipoLata,
  type AssadeiraCandidato,
  type ProdutoUnidadesLataMeta,
} from '@/lib/production/ordem-producao-assadeira';
import { normalizeToISODate } from '@/lib/utils/date-utils';
import type { Database } from '@/types/database';

const PLANEJADO_EDITAVEL = 'planejado' as const;

export function isOrdemProducaoPlanejadaEditavel(status: string | null | undefined): boolean {
  return (status ?? PLANEJADO_EDITAVEL) === PLANEJADO_EDITAVEL;
}

/**
 * Gera `OP-YYYYMMDD-xxx` com prefixo baseado na data de produção (YYYY-MM-DD),
 * contando ordens existentes com o mesmo prefixo (inclui canceladas no count de sequência — aceitável; alternativa: excluir cancelado numa iteracão futura).
 */
export async function generateLoteCodigoForDataProducao(
  supabase: SupabaseClient<Database>,
  dataProducaoIso: string,
): Promise<string> {
  const d = normalizeToISODate(dataProducaoIso).replace(/-/g, '');
  const prefix = `OP-${d}-`;
  const { data: lastOp } = await supabase
    .from('ordens_producao')
    .select('lote_codigo')
    .ilike('lote_codigo', `${prefix}%`)
    .order('lote_codigo', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sequence = 1;
  if (lastOp?.lote_codigo) {
    const parts = lastOp.lote_codigo.split('-');
    if (parts.length === 3) {
      const n = parseInt(parts[2]!, 10);
      if (!Number.isNaN(n)) sequence = n + 1;
    }
  }
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

export type DiariaHeaderDates = {
  dataProducao: string;
  dataEtiquetaDefault: string;
};

export async function fetchProdutoMetaForAssadeira(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<ProdutoUnidadesLataMeta | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('unidades_assadeira, unidades_lata_antiga, unidades_lata_nova')
    .eq('id', produtoId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    unidades_assadeira: data.unidades_assadeira ?? null,
    unidades_lata_antiga: data.unidades_lata_antiga ?? null,
    unidades_lata_nova: data.unidades_lata_nova ?? null,
  };
}

export async function fetchAssadeiraCandidatos(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<AssadeiraCandidato[]> {
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .select('assadeira_id, unidades_por_assadeira')
    .eq('produto_id', produtoId);
  if (error || !data?.length) return [];
  const rows = data
    .map((r) => ({
      assadeira_id: String(r.assadeira_id),
      unidades_por_assadeira: Math.round(Number(r.unidades_por_assadeira)),
    }))
    .filter(
      (r) =>
        r.assadeira_id &&
        Number.isFinite(r.unidades_por_assadeira) &&
        r.unidades_por_assadeira > 0,
    );
  rows.sort((a, b) => {
    if (a.unidades_por_assadeira !== b.unidades_por_assadeira) {
      return a.unidades_por_assadeira - b.unidades_por_assadeira;
    }
    return a.assadeira_id.localeCompare(b.assadeira_id);
  });
  return rows;
}

type OrdemProducaoInsert = Database['interno']['Tables']['ordens_producao']['Insert'];

export async function insertOrdemProducaoForDiariaItem(input: {
  supabase: SupabaseClient<Database>;
  header: DiariaHeaderDates;
  itemId: string;
  prioridade: number;
  produtoId: string;
  tipoLata: OrdemProducaoTipoLata;
  latasPlanejadas: number;
  dataProducaoOverride: string | null;
}): Promise<{ opId: string } | { error: string }> {
  const dataProducaoOp =
    input.dataProducaoOverride != null && String(input.dataProducaoOverride).trim() !== ''
      ? normalizeToISODate(input.dataProducaoOverride)
      : normalizeToISODate(input.header.dataProducao);

  const meta = await fetchProdutoMetaForAssadeira(input.supabase, input.produtoId);
  if (!meta) return { error: 'Produto não encontrado para resolver lata.' };
  const candidatos = await fetchAssadeiraCandidatos(input.supabase, input.produtoId);
  const assadeiraId = resolveAssadeiraIdForTipoLata(input.tipoLata, meta, candidatos);

  const lote = await generateLoteCodigoForDataProducao(input.supabase, dataProducaoOp);

  const insertRow: OrdemProducaoInsert = {
    produto_id: input.produtoId,
    qtd_planejada: input.latasPlanejadas,
    pedido_id: null,
    prioridade: 0,
    lote_codigo: lote,
    status: 'planejado',
    data_producao: dataProducaoOp,
    ordem_planejamento: input.prioridade,
    assadeira_id: assadeiraId,
    temporaria: false,
    temporaria_expira_em: null,
  };

  const { data: inserted, error } = await input.supabase
    .from('ordens_producao')
    .insert(insertRow)
    .select('id')
    .single();

  if (error || !inserted?.id) {
    return { error: error?.message ?? 'Falha ao criar ordem de produção.' };
  }

  const { error: linkErr } = await input.supabase
    .from('ordens_producao_diarias_itens')
    .update({ ordens_producao_id: inserted.id, updated_at: new Date().toISOString() })
    .eq('id', input.itemId);

  if (linkErr) {
    await input.supabase.from('ordens_producao').delete().eq('id', inserted.id);
    return { error: linkErr.message };
  }

  return { opId: inserted.id };
}

export async function updateOrdemProducaoForDiariaItem(input: {
  supabase: SupabaseClient<Database>;
  opId: string;
  header: DiariaHeaderDates;
  prioridade: number;
  produtoId: string;
  tipoLata: OrdemProducaoTipoLata;
  latasPlanejadas: number;
  dataProducaoOverride: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const { data: op, error: fe } = await input.supabase
    .from('ordens_producao')
    .select('id, status')
    .eq('id', input.opId)
    .maybeSingle();
  if (fe || !op) return { error: fe?.message ?? 'OP não encontrada.' };
  if (!isOrdemProducaoPlanejadaEditavel(op.status)) {
    return {
      error:
        'Esta ordem já saiu do estado planejado; não é possível alterar produto, quantidade ou lata aqui.',
    };
  }

  const dataProducaoOp =
    input.dataProducaoOverride != null && String(input.dataProducaoOverride).trim() !== ''
      ? normalizeToISODate(input.dataProducaoOverride)
      : normalizeToISODate(input.header.dataProducao);

  const meta = await fetchProdutoMetaForAssadeira(input.supabase, input.produtoId);
  if (!meta) return { error: 'Produto não encontrado.' };
  const candidatos = await fetchAssadeiraCandidatos(input.supabase, input.produtoId);
  const assadeiraId = resolveAssadeiraIdForTipoLata(input.tipoLata, meta, candidatos);

  const { error } = await input.supabase
    .from('ordens_producao')
    .update({
      produto_id: input.produtoId,
      qtd_planejada: input.latasPlanejadas,
      data_producao: dataProducaoOp,
      ordem_planejamento: input.prioridade,
      assadeira_id: assadeiraId,
    })
    .eq('id', input.opId)
    .or('status.eq.planejado,status.is.null');

  if (error) return { error: error.message };
  return { ok: true };
}
