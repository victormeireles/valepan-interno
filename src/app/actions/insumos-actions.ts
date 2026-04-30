'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

export interface Insumo {
  id: string;
  nome: string;
  custo_unitario: number;
  unidade_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  unidades?: {
    id: string;
    nome: string;
    nome_resumido: string;
    codigo: string;
  };
}

interface CreateInsumoParams {
  nome: string;
  custo_unitario: number;
  unidade_id: string;
  ativo?: boolean;
}

interface UpdateInsumoParams {
  id: string;
  nome?: string;
  custo_unitario?: number;
  unidade_id?: string;
  ativo?: boolean;
}

async function mergeInsumosComUnidades(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  rows: Record<string, unknown>[],
): Promise<Insumo[]> {
  if (rows.length === 0) return [];
  const uids = [
    ...new Set(rows.map((r) => r.unidade_id as string).filter((id): id is string => Boolean(id?.trim()))),
  ];
  const { data: unRows } = await supabase
    .from('unidades')
    .select('id, nome, nome_resumido, codigo')
    .in('id', uids);
  const uById = new Map((unRows ?? []).map((u) => [u.id, u]));
  return rows.map((r) => {
    const row = r as unknown as Insumo;
    const u = row.unidade_id ? uById.get(row.unidade_id) : undefined;
    return {
      ...row,
      unidades: u
        ? {
            id: u.id,
            nome: u.nome,
            nome_resumido: u.nome_resumido,
            codigo: u.codigo,
          }
        : undefined,
    };
  });
}

export async function getInsumos(includeInactive = false) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  let query = supabase.from('insumos').select('*').order('nome', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar insumos:', error);
    return [];
  }

  return mergeInsumosComUnidades(supabase, data ?? []);
}

export async function getInsumoById(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase.from('insumos').select('*').eq('id', id).single();

  if (error) {
    console.error('Erro ao buscar insumo:', error);
    return null;
  }

  const [merged] = await mergeInsumosComUnidades(supabase, data ? [data as Record<string, unknown>] : []);
  return merged ?? null;
}

/** Busca vários insumos de uma vez (ex.: nomes para lista de ingredientes da receita / lote). */
export async function getInsumosByIds(ids: string[]): Promise<Insumo[]> {
  const unique = [...new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return [];

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase.from('insumos').select('*').in('id', unique);

  if (error) {
    console.error('Erro ao buscar insumos por ids:', error);
    return [];
  }

  return mergeInsumosComUnidades(supabase, data ?? []);
}

export async function createInsumo(params: CreateInsumoParams) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    // Validações
    if (!params.nome || params.nome.trim().length === 0) {
      return { success: false, error: 'Nome é obrigatório' };
    }

    if (params.custo_unitario < 0) {
      return { success: false, error: 'Custo unitário não pode ser negativo' };
    }

    if (!params.unidade_id) {
      return { success: false, error: 'Unidade é obrigatória' };
    }

    const { data, error } = await supabase
      .from('insumos')
      .insert({
        nome: params.nome.trim(),
        custo_unitario: params.custo_unitario,
        unidade_id: params.unidade_id,
        ativo: params.ativo ?? true,
      })
      .select()
      .single();

    if (error) {
      // Verifica se é erro de constraint UNIQUE
      if (error.code === '23505') {
        return { success: false, error: 'Já existe um insumo com este nome' };
      }
      throw error;
    }

    revalidatePath('/insumos');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar insumo:', error);
    return { success: false, error: 'Erro ao criar insumo' };
  }
}

export async function updateInsumo(params: UpdateInsumoParams) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const updateData: Record<string, unknown> = {};

    if (params.nome !== undefined) {
      if (!params.nome || params.nome.trim().length === 0) {
        return { success: false, error: 'Nome não pode ser vazio' };
      }
      updateData.nome = params.nome.trim();
    }

    if (params.custo_unitario !== undefined) {
      if (params.custo_unitario < 0) {
        return { success: false, error: 'Custo unitário não pode ser negativo' };
      }
      updateData.custo_unitario = params.custo_unitario;
    }

    if (params.unidade_id !== undefined) {
      updateData.unidade_id = params.unidade_id;
    }

    if (params.ativo !== undefined) {
      updateData.ativo = params.ativo;
    }

    const { data, error } = await supabase
      .from('insumos')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      // Verifica se é erro de constraint UNIQUE
      if (error.code === '23505') {
        return { success: false, error: 'Já existe um insumo com este nome' };
      }
      throw error;
    }

    revalidatePath('/insumos');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar insumo:', error);
    return { success: false, error: 'Erro ao atualizar insumo' };
  }
}

export async function deleteInsumo(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    // Soft delete: marca como inativo
    const { error } = await supabase
      .from('insumos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/insumos');
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar insumo:', error);
    return { success: false, error: 'Erro ao deletar insumo' };
  }
}













