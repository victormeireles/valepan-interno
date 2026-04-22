'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

import type { Tables } from '@/types/database';

const PATH = '/carrinhos';

export type CarrinhoRow = Tables<'carrinhos'>;

export type CarrinhosLoadResult =
  | { ok: true; list: CarrinhoRow[] }
  | { ok: false; message: string };

export async function getCarrinhos(): Promise<CarrinhosLoadResult> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('carrinhos')
    .select('*')
    .order('numero', { ascending: true });

  if (error) {
    return {
      ok: false,
      message: error.message || 'Erro ao carregar carrinhos.',
    };
  }

  return { ok: true, list: (data ?? []) as CarrinhoRow[] };
}

function clampInt(n: number, min: number, max?: number): number {
  let v = Math.round(n);
  if (!Number.isFinite(v)) v = min;
  if (v < min) v = min;
  if (max !== undefined && v > max) v = max;
  return v;
}

/** Bandejas e latas são a mesma unidade no carrinho; gravamos o mesmo valor nas duas colunas do banco. */
export async function createCarrinho(input: {
  numero: number;
  /** Capacidade máxima (bandejas = latas). */
  capacidadeBandejasLatas?: number;
  precisaReparos?: boolean;
  emUso?: boolean;
  latasOcupadas?: number;
  ativo?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const n = Math.round(input.numero);
  if (!Number.isFinite(n) || n <= 0) {
    return { success: false, error: 'Informe um número do carrinho maior que zero.' };
  }

  const capacidade = Math.max(0, Math.round(input.capacidadeBandejasLatas ?? 0));
  const emUso = input.emUso ?? false;
  let latasOcupadas = Math.max(0, Math.round(input.latasOcupadas ?? 0));
  if (!emUso) latasOcupadas = 0;
  if (capacidade > 0) {
    latasOcupadas = Math.min(latasOcupadas, capacidade);
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error } = await supabase.from('carrinhos').insert({
    numero: n,
    bandejas: capacidade,
    precisa_reparos: input.precisaReparos ?? false,
    quantidade_latas: capacidade,
    em_uso: emUso,
    latas_ocupadas: latasOcupadas,
    ativo: input.ativo ?? true,
  });

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { success: false, error: 'Já existe um carrinho com este número.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(PATH);
  return { success: true };
}

export async function updateCarrinho(input: {
  id: string;
  numero: number;
  /** Capacidade máxima (bandejas = latas). */
  capacidadeBandejasLatas: number;
  precisaReparos: boolean;
  emUso: boolean;
  latasOcupadas: number;
  ativo: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const n = Math.round(input.numero);
  if (!Number.isFinite(n) || n <= 0) {
    return { success: false, error: 'O número do carrinho deve ser maior que zero.' };
  }

  const capacidade = clampInt(input.capacidadeBandejasLatas, 0);
  const emUso = input.emUso;
  let latasOcupadas = clampInt(input.latasOcupadas, 0);
  if (!emUso) latasOcupadas = 0;
  if (capacidade > 0) {
    latasOcupadas = Math.min(latasOcupadas, capacidade);
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error } = await supabase
    .from('carrinhos')
    .update({
      numero: n,
      bandejas: capacidade,
      precisa_reparos: input.precisaReparos,
      quantidade_latas: capacidade,
      em_uso: emUso,
      latas_ocupadas: latasOcupadas,
      ativo: input.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { success: false, error: 'Já existe outro carrinho com este número.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(PATH);
  return { success: true };
}
