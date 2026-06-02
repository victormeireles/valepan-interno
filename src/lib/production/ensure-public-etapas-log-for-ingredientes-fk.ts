import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabasePublicSchemaClient } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';
import { ensurePublicOrdemForEtapasLogFk } from '@/lib/production/ensure-public-ordem-for-etapas-fk';

/**
 * Fallback quando `interno.producao_massa_ingredientes.producao_etapas_log_id` ainda referencia
 * `public.producao_etapas_log`: espelha o log de interno → public até aplicar
 * sql/PATCH_FK_PRODUCAO_MASSA_INGREDIENTES_LOG_INTERNO.sql
 */
export async function ensurePublicEtapasLogForIngredientesFk(
  interno: SupabaseClient<Database>,
  publicClient: SupabasePublicSchemaClient,
  logId: string,
): Promise<{ synced: boolean; error?: string }> {
  const id = logId.trim();
  if (!id) return { synced: false, error: 'ID vazio' };

  const { data: inPublic, error: pubCheckErr } = await publicClient
    .from('producao_etapas_log')
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
    .from('producao_etapas_log')
    .select(
      'id, ordem_producao_id, etapa, usuario_id, inicio, fim, qtd_entrada, qtd_saida, perda_qtd, dados_qualidade, fotos',
    )
    .eq('id', id)
    .maybeSingle();
  if (srcErr || !src) {
    return { synced: false, error: srcErr?.message ?? 'Log não encontrado em interno' };
  }

  const row = src as Record<string, unknown>;
  const ordemId = String(row.ordem_producao_id ?? '').trim();
  if (ordemId) {
    await ensurePublicOrdemForEtapasLogFk(interno, publicClient, ordemId);
  }

  const payload: Record<string, unknown> = {
    id: row.id,
    ordem_producao_id: row.ordem_producao_id,
    etapa: row.etapa,
    usuario_id: row.usuario_id ?? null,
    inicio: row.inicio ?? new Date().toISOString(),
    fim: row.fim ?? null,
    qtd_entrada: row.qtd_entrada ?? null,
    qtd_saida: row.qtd_saida ?? null,
    perda_qtd: row.perda_qtd ?? 0,
    dados_qualidade: row.dados_qualidade ?? null,
    fotos: row.fotos ?? [],
  };

  const { error: insErr } = await publicClient.from('producao_etapas_log').insert(payload);
  if (insErr) {
    return { synced: false, error: insErr.message };
  }
  return { synced: true };
}
