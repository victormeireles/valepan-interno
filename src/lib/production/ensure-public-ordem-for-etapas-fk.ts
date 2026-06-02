import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabasePublicSchemaClient } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

/**
 * Fallback quando `interno.producao_etapas_log.ordem_producao_id` ainda referencia `public.ordens_producao`:
 * espelha a linha de interno → public para satisfazer a FK legada até aplicar
 * sql/PATCH_FK_PRODUCAO_ETAPAS_LOG_ORDEM_INTERNO.sql
 */
export async function ensurePublicOrdemForEtapasLogFk(
  interno: SupabaseClient<Database>,
  publicClient: SupabasePublicSchemaClient,
  ordemId: string,
): Promise<{ synced: boolean; error?: string }> {
  const id = ordemId.trim();
  if (!id) return { synced: false, error: 'ID vazio' };

  const { data: inPublic, error: pubCheckErr } = await publicClient
    .from('ordens_producao')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (pubCheckErr) {
    const msg = String(pubCheckErr.message ?? '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('schema cache')) {
      return { synced: false };
    }
    return { synced: false, error: pubCheckErr.message };
  }
  if (inPublic?.id) return { synced: false };

  const { data: src, error: srcErr } = await interno
    .from('ordens_producao')
    .select(
      'id, produto_id, qtd_planejada, lote_codigo, status, data_producao, pedido_id, prioridade, assadeira_id, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (srcErr || !src) {
    return { synced: false, error: srcErr?.message ?? 'OP não encontrada em interno' };
  }

  const row = src as Record<string, unknown>;
  const payload: Record<string, unknown> = {
    id: row.id,
    produto_id: row.produto_id,
    qtd_planejada: row.qtd_planejada,
    lote_codigo: row.lote_codigo,
    status: row.status ?? 'planejado',
    data_producao: row.data_producao,
    pedido_id: row.pedido_id ?? null,
    prioridade: row.prioridade ?? 0,
    created_at: row.created_at ?? new Date().toISOString(),
  };
  if (row.assadeira_id != null && String(row.assadeira_id).trim() !== '') {
    payload.assadeira_id = row.assadeira_id;
  }

  const { error: insErr } = await publicClient.from('ordens_producao').insert(payload);
  if (insErr) {
    const msg = String(insErr.message ?? '').toLowerCase();
    if (msg.includes('assadeira_id') || msg.includes('schema cache')) {
      delete payload.assadeira_id;
      const { error: retryErr } = await publicClient.from('ordens_producao').insert(payload);
      if (retryErr) {
        return { synced: false, error: retryErr.message };
      }
      return { synced: true };
    }
    return { synced: false, error: insErr.message };
  }
  return { synced: true };
}
