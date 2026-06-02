'use server';

import {
  mirrorAssadeiraRowToPublic,
  syncAllInternoAssadeirasToPublic,
  syncAssadeirasFromInternoToPublic,
} from '@/lib/catalog/assadeiras-catalog';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

import type { Tables } from '@/types/database';

const PATH_LATAS = '/produtos/latas';

function revalidateAssadeirasPaths(): void {
  revalidatePath(PATH_LATAS);
}

export type AssadeiraRow = Tables<'assadeiras'>;

export type AssadeirasLoadResult =
  | { ok: true; list: AssadeiraRow[] }
  | { ok: false; message: string };

export async function getAssadeiras(): Promise<AssadeirasLoadResult> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('assadeiras')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (error) {
    return {
      ok: false,
      message: error.message || 'Erro ao carregar.',
    };
  }

  try {
    await syncAllInternoAssadeirasToPublic(supabase);
  } catch {
    /* listagem segue com interno; save espelha public antes do insert */
  }

  return { ok: true, list: (data ?? []) as AssadeiraRow[] };
}

function parseNumeroBuracos(raw: number | undefined): number {
  if (raw === undefined || raw === null || !Number.isFinite(raw)) return 0;
  const n = Math.round(raw);
  return n < 0 ? 0 : n;
}

function parseDiametroBuracosMm(raw: number | null | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  if (!Number.isFinite(raw) || raw < 0) return null;
  return Math.round(raw * 100) / 100;
}

export async function createAssadeira(input: {
  nome: string;
  codigo?: string | null;
  ordem?: number;
  numeroBuracos?: number;
  quantidadeLatas: number;
  descricao?: string | null;
  diametroBuracosMm?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  const nome = input.nome.trim();
  if (!nome) {
    return { success: false, error: 'Informe o nome da assadeira.' };
  }

  if (!Number.isFinite(input.quantidadeLatas)) {
    return { success: false, error: 'Informe a quantidade de latas.' };
  }
  const quantidadeLatas = parseNumeroBuracos(input.quantidadeLatas);
  const numeroBuracos = parseNumeroBuracos(input.numeroBuracos);
  const descricao =
    input.descricao != null && String(input.descricao).trim() !== ''
      ? String(input.descricao).trim()
      : null;
  const diametroBuracosMm = parseDiametroBuracosMm(input.diametroBuracosMm ?? null);

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: created, error } = await supabase
    .from('assadeiras')
    .insert({
      nome,
      codigo: input.codigo?.trim() || null,
      ordem: input.ordem ?? 0,
      numero_buracos: numeroBuracos,
      quantidade_latas: quantidadeLatas,
      descricao,
      diametro_buracos_mm: diametroBuracosMm,
      ativo: true,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    await mirrorAssadeiraRowToPublic(supabase, created.id);
  } catch (mirrorErr) {
    const msg = mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr);
    return { success: false, error: `Lata criada no cadastro interno, mas falhou ao sincronizar: ${msg}` };
  }

  revalidateAssadeirasPaths();
  return { success: true };
}

export async function updateAssadeira(input: {
  id: string;
  nome: string;
  codigo?: string | null;
  ordem: number;
  ativo: boolean;
  numeroBuracos?: number;
  quantidadeLatas: number;
  descricao?: string | null;
  diametroBuracosMm?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  const nome = input.nome.trim();
  if (!nome) {
    return { success: false, error: 'Informe o nome.' };
  }

  if (!Number.isFinite(input.quantidadeLatas)) {
    return { success: false, error: 'Informe a quantidade de latas.' };
  }
  const quantidadeLatas = parseNumeroBuracos(input.quantidadeLatas);
  const numeroBuracos = parseNumeroBuracos(input.numeroBuracos);
  const descricao =
    input.descricao != null && String(input.descricao).trim() !== ''
      ? String(input.descricao).trim()
      : null;
  const diametroBuracosMm = parseDiametroBuracosMm(input.diametroBuracosMm ?? null);

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error } = await supabase
    .from('assadeiras')
    .update({
      nome,
      codigo: input.codigo?.trim() || null,
      ordem: input.ordem,
      numero_buracos: numeroBuracos,
      quantidade_latas: quantidadeLatas,
      descricao,
      diametro_buracos_mm: diametroBuracosMm,
      ativo: input.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    await mirrorAssadeiraRowToPublic(supabase, input.id);
  } catch (mirrorErr) {
    const msg = mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr);
    return { success: false, error: `Falha ao sincronizar lata no catálogo do banco: ${msg}` };
  }

  revalidateAssadeirasPaths();
  return { success: true };
}

/** Atualiza o mesmo conjunto de campos em várias assadeiras (uma query). */
export async function updateAssadeirasBulk(input: {
  ids: string[];
  /** Se definido, grava em todas as selecionadas. */
  numeroBuracos?: number;
  quantidadeLatas?: number;
  ativo?: boolean;
}): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const ids = [...new Set((input.ids ?? []).map((x) => String(x).trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { success: false, error: 'Selecione ao menos uma lata.' };
  }
  const hasNum = input.numeroBuracos !== undefined;
  const hasQtd = input.quantidadeLatas !== undefined;
  const hasAtivo = input.ativo !== undefined;
  if (!hasNum && !hasQtd && !hasAtivo) {
    return { success: false, error: 'Indique ao menos um campo para alterar (buracos, quantidade ou ativo).' };
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (hasNum) {
    patch.numero_buracos = parseNumeroBuracos(input.numeroBuracos);
  }
  if (hasQtd) {
    if (!Number.isFinite(input.quantidadeLatas)) {
      return { success: false, error: 'Quantidade de latas inválida.' };
    }
    patch.quantidade_latas = parseNumeroBuracos(input.quantidadeLatas);
  }
  if (hasAtivo) {
    patch.ativo = Boolean(input.ativo);
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { error, data } = await supabase.from('assadeiras').update(patch).in('id', ids).select('id');
  if (error) {
    return { success: false, error: error.message };
  }
  try {
    await syncAssadeirasFromInternoToPublic(supabase, ids);
  } catch (mirrorErr) {
    const msg = mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr);
    return { success: false, error: `Falha ao sincronizar latas no catálogo do banco: ${msg}` };
  }
  const count = data?.length ?? ids.length;
  revalidateAssadeirasPaths();
  return { success: true, count };
}

export async function deleteAssadeira(input: { id: string }): Promise<{ success: boolean; error?: string }> {
  if (!input.id?.trim()) {
    return { success: false, error: 'Assadeira inválida.' };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error: delBloqueiosErr } = await supabase
    .from('cliente_assadeira_bloqueios')
    .delete()
    .eq('assadeira_id', input.id);
  if (delBloqueiosErr) {
    return { success: false, error: delBloqueiosErr.message };
  }

  const { error: delVinculosErr } = await supabase
    .from('produto_assadeiras')
    .delete()
    .eq('assadeira_id', input.id);
  if (delVinculosErr) {
    return { success: false, error: delVinculosErr.message };
  }

  const { error: delAssadeiraErr } = await supabase.from('assadeiras').delete().eq('id', input.id);
  if (delAssadeiraErr) {
    return { success: false, error: delAssadeiraErr.message };
  }

  revalidateAssadeirasPaths();
  return { success: true };
}
