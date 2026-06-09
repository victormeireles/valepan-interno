'use server';

import { revalidatePath } from 'next/cache';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import {
  parseAssadeiraForm,
  type AssadeiraFormData,
} from '@/domain/assadeiras/assadeira-validation';

export type Assadeira = {
  id: string;
  nome: string;
  descricao: string | null;
  unidades_por_assadeira: number | null;
  quantidade: number;
  ordem: number;
  ativo: boolean;
  diametro_buracos_mm: number | null;
  created_at: string;
  updated_at: string;
};

type ActionResult<T = Assadeira> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getAssadeiras(
  includeInactive = true,
): Promise<Assadeira[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  let query = supabase
    .from('assadeiras')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar assadeiras:', error);
    return [];
  }
  return (data ?? []) as Assadeira[];
}

export async function createAssadeira(
  input: AssadeiraFormData,
): Promise<ActionResult> {
  const parsed = parseAssadeiraForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('assadeiras')
    .insert({
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      unidades_por_assadeira: parsed.data.unidades_por_assadeira,
      quantidade: parsed.data.quantidade,
      ordem: parsed.data.ordem ?? 0,
      ativo: parsed.data.ativo ?? true,
      diametro_buracos_mm: parsed.data.diametro_buracos_mm ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar assadeira:', error);
    return { success: false, error: 'Erro ao criar assadeira' };
  }

  revalidatePath('/config/assadeiras');
  return { success: true, data: data as Assadeira };
}

export async function updateAssadeira(
  id: string,
  input: AssadeiraFormData,
): Promise<ActionResult> {
  const parsed = parseAssadeiraForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('assadeiras')
    .update({
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      unidades_por_assadeira: parsed.data.unidades_por_assadeira,
      quantidade: parsed.data.quantidade,
      ordem: parsed.data.ordem ?? 0,
      ativo: parsed.data.ativo ?? true,
      diametro_buracos_mm: parsed.data.diametro_buracos_mm ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar assadeira:', error);
    return { success: false, error: 'Erro ao atualizar assadeira' };
  }

  revalidatePath('/config/assadeiras');
  return { success: true, data: data as Assadeira };
}

export async function deactivateAssadeira(
  id: string,
): Promise<ActionResult<Assadeira>> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('assadeiras')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao desativar assadeira:', error);
    return { success: false, error: 'Erro ao desativar assadeira' };
  }

  revalidatePath('/config/assadeiras');
  return { success: true, data: data as Assadeira };
}
