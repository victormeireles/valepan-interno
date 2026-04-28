'use server';

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

  const { error } = await supabase.from('assadeiras').insert({
    nome,
    codigo: input.codigo?.trim() || null,
    ordem: input.ordem ?? 0,
    numero_buracos: numeroBuracos,
    quantidade_latas: quantidadeLatas,
    descricao,
    diametro_buracos_mm: diametroBuracosMm,
    ativo: true,
  });

  if (error) {
    return { success: false, error: error.message };
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

  revalidateAssadeirasPaths();
  return { success: true };
}
