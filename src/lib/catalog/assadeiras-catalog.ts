import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeAssadeiraUuid(id: string): string | null {
  const t = id.trim().toLowerCase();
  return UUID_RE.test(t) ? t : null;
}

type InternoClient = SupabaseClient<Database>;

export type AssadeiraCatalogRow = {
  id: string;
  nome: string;
  codigo: string | null;
  ativo: boolean;
  ordem: number;
  numero_buracos?: number;
  quantidade_latas?: number;
  descricao?: string | null;
  diametro_buracos_mm?: number | null;
};

function toAssadeiraPayload(r: AssadeiraCatalogRow) {
  return {
    id: r.id,
    nome: r.nome,
    codigo: r.codigo,
    ativo: r.ativo ?? true,
    ordem: r.ordem ?? 0,
    numero_buracos: r.numero_buracos ?? 0,
    quantidade_latas: r.quantidade_latas ?? 0,
    descricao: r.descricao ?? null,
    diametro_buracos_mm: r.diametro_buracos_mm ?? null,
  };
}

async function loadAssadeiraIdSet(
  client: SupabaseClient,
  schemaLabel: 'interno' | 'public',
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await client.from('assadeiras').select('id').in('id', ids);
  if (error) {
    throw new Error(`${schemaLabel}.assadeiras: ${error.message}`);
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const n = normalizeAssadeiraUuid(String(row.id));
    if (n) set.add(n);
  }
  return set;
}

/** FK de `interno.produto_assadeiras` aponta para `public.assadeiras` — espelha linhas do interno. */
export async function syncAssadeirasFromInternoToPublic(
  interno: InternoClient,
  ids: string[],
): Promise<void> {
  const normalized = [...new Set(ids.map((id) => normalizeAssadeiraUuid(id)).filter((id): id is string => !!id))];
  if (normalized.length === 0) return;

  const { data: rows, error } = await interno.from('assadeiras').select('*').in('id', normalized);
  if (error) throw error;
  if (!rows?.length) return;

  const pub = supabaseClientFactory.createServiceRolePublicClient();
  const { error: upsertErr } = await pub
    .from('assadeiras')
    .upsert(rows.map((r) => toAssadeiraPayload(r as AssadeiraCatalogRow)), { onConflict: 'id' });
  if (upsertErr) throw upsertErr;
}

/** Espelha uma lata recém-gravada em `interno` para `public` (necessário para vínculos em produto_assadeiras). */
export async function mirrorAssadeiraRowToPublic(
  interno: InternoClient,
  assadeiraId: string,
): Promise<void> {
  const id = normalizeAssadeiraUuid(assadeiraId);
  if (!id) return;
  await syncAssadeirasFromInternoToPublic(interno, [id]);
}

export async function syncAllInternoAssadeirasToPublic(interno: InternoClient): Promise<void> {
  const { data: rows, error } = await interno.from('assadeiras').select('id');
  if (error || !rows?.length) return;
  await syncAssadeirasFromInternoToPublic(
    interno,
    rows.map((r) => String(r.id)),
  );
}

async function syncAssadeirasFromPublicToInterno(
  interno: InternoClient,
  missingIds: string[],
): Promise<void> {
  if (missingIds.length === 0) return;

  const pub = supabaseClientFactory.createServiceRolePublicClient();
  const { data: pubRows, error: pubErr } = await pub.from('assadeiras').select('*').in('id', missingIds);

  if (pubErr) throw pubErr;

  const rows = (pubRows ?? []) as AssadeiraCatalogRow[];
  if (rows.length === 0) return;

  const { error: upsertErr } = await interno
    .from('assadeiras')
    .upsert(rows.map(toAssadeiraPayload), { onConflict: 'id' });
  if (upsertErr) throw upsertErr;
}

async function ensureInternoCatalogHasIds(
  interno: InternoClient,
  normalized: string[],
): Promise<string[]> {
  let existing = await loadAssadeiraIdSet(interno, 'interno', normalized);
  let missing = normalized.filter((id) => !existing.has(id));

  if (missing.length > 0) {
    await syncAssadeirasFromPublicToInterno(interno, missing);
    existing = await loadAssadeiraIdSet(interno, 'interno', normalized);
    missing = normalized.filter((id) => !existing.has(id));
  }

  if (missing.length > 0) {
    throw new Error(`interno_missing:${missing.join(',')}`);
  }

  return normalized;
}

/**
 * Garante latas em `interno` e em `public` antes de gravar `interno.produto_assadeiras`
 * (a FK de assadeira_id referencia `public.assadeiras`).
 */
export async function ensureAssadeirasExistForProdutoAssadeirasSave(
  interno: InternoClient,
  requestedIds: string[],
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const normalized = [
    ...new Set(
      requestedIds.map((id) => normalizeAssadeiraUuid(id)).filter((id): id is string => id != null),
    ),
  ];

  if (normalized.length !== requestedIds.length) {
    return {
      ok: false,
      error:
        'Identificador de lata inválido. Atualize a página (F5) e selecione novamente as latas no cadastro.',
    };
  }

  if (normalized.length === 0) {
    return { ok: true, ids: [] };
  }

  try {
    await ensureInternoCatalogHasIds(interno, normalized);
    await syncAssadeirasFromInternoToPublic(interno, normalized);

    const inPublic = await loadAssadeiraIdSet(
      supabaseClientFactory.createServiceRolePublicClient(),
      'public',
      normalized,
    );
    const missingPublic = normalized.filter((id) => !inPublic.has(id));
    if (missingPublic.length > 0) {
      return {
        ok: false,
        error:
          'Não foi possível registrar a lata no catálogo do banco. Tente salvar de novo; se persistir, avise o suporte.',
      };
    }

    return { ok: true, ids: normalized };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith('interno_missing:')) {
      return {
        ok: false,
        error:
          'Uma ou mais latas não estão no cadastro. Abra «Latas cadastradas», crie ou edite a lata, atualize a página (F5) e tente de novo.',
      };
    }
    return { ok: false, error: msg };
  }
}

/** @deprecated Use ensureAssadeirasExistForProdutoAssadeirasSave */
export async function ensureAssadeirasExistInInterno(
  interno: InternoClient,
  requestedIds: string[],
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  return ensureAssadeirasExistForProdutoAssadeirasSave(interno, requestedIds);
}

export async function syncPublicProdutoAssadeirasLinksToInterno(
  interno: InternoClient,
  produtoIds: string[],
): Promise<void> {
  if (produtoIds.length === 0) return;

  const pub = supabaseClientFactory.createServiceRolePublicClient();
  const { data: pubRows, error: pubErr } = await pub
    .from('produto_assadeiras')
    .select('produto_id, assadeira_id, unidades_por_assadeira')
    .in('produto_id', produtoIds);

  if (pubErr || !pubRows?.length) return;

  const { data: intRows, error: intErr } = await interno
    .from('produto_assadeiras')
    .select('produto_id, assadeira_id')
    .in('produto_id', produtoIds);

  if (intErr) return;

  const keys = new Set((intRows ?? []).map((r) => `${r.produto_id}|${r.assadeira_id}`));
  const toCopy = pubRows.filter((r) => !keys.has(`${r.produto_id}|${r.assadeira_id}`));
  if (toCopy.length === 0) return;

  const assadeiraIds = [...new Set(toCopy.map((r) => String(r.assadeira_id)))];
  const ensured = await ensureAssadeirasExistForProdutoAssadeirasSave(interno, assadeiraIds);
  if (!ensured.ok) return;

  await interno.from('produto_assadeiras').upsert(
    toCopy.map((r) => ({
      produto_id: r.produto_id,
      assadeira_id: r.assadeira_id,
      unidades_por_assadeira: r.unidades_por_assadeira,
    })),
    { onConflict: 'produto_id,assadeira_id' },
  );
}
