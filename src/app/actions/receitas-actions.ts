'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/database';

type TipoReceita = Database['public']['Enums']['tipo_receita'];

export interface ReceitaIngredienteInput {
  id?: string;
  insumoId: string;
  quantidade: number;
}

export interface ReceitaInput {
  nome: string;
  tipo: TipoReceita;
  codigo?: string | null;
  ativo?: boolean;
  ingredientes: ReceitaIngredienteInput[];
}

export interface ReceitaUpdateInput extends Partial<ReceitaInput> {
  id: string;
}

export interface ReceitaWithRelations {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: TipoReceita;
  ativo: boolean | null;
  created_at: string | null;
  receita_ingredientes: Array<{
    id: string;
    quantidade_padrao: number;
    insumo_id: string | null;
    insumos: {
      id: string;
      nome: string;
      unidade_id: string;
      unidades: {
        id: string;
        nome: string;
        nome_resumido: string;
        codigo: string;
      } | null;
    } | null;
  }>;
  produto_receitas: Array<{
    id: string;
    tipo: TipoReceita;
    quantidade_por_produto: number;
    ativo: boolean;
    produtos: {
      id: string;
      nome: string;
    } | null;
  }>;
}

const RECEITAS_PATH = '/receitas';

export async function getReceitas(includeInactive = false) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  let query = supabase
    .from('receitas')
    .select(`
      *,
      receita_ingredientes (
        id,
        quantidade_padrao,
        insumo_id,
        insumos (
          id,
          nome,
          unidade_id,
          unidades (
            id,
            nome,
            nome_resumido,
            codigo
          )
        )
      ),
      produto_receitas (
        id,
        quantidade_por_produto,
        ativo,
        produtos (
          id,
          nome
        ),
        receitas (
          tipo
        )
      )
    `)
    .order('nome', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar receitas:', error);
    return [];
  }

  return (data || []) as unknown as ReceitaWithRelations[];
}

export async function getReceitaDetalhes(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('receitas')
    .select(`
      *,
      receita_ingredientes (
        id,
        quantidade_padrao,
        insumo_id,
        insumos (
          id,
          nome,
          unidade_id,
          unidades (
            id,
            nome,
            nome_resumido,
            codigo
          )
        )
      ),
      produto_receitas (
        id,
        quantidade_por_produto,
        ativo,
        produtos (
          id,
          nome
        ),
        receitas (
          tipo
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar receita:', error);
    return null;
  }

  return data as unknown as ReceitaWithRelations;
}

export async function createReceita(payload: ReceitaInput) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    validateReceitaPayload(payload);

    const { data, error } = await supabase
      .from('receitas')
      .insert({
        nome: payload.nome.trim(),
        tipo: payload.tipo,
        codigo: payload.codigo?.trim() || null,
        ativo: payload.ativo ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    await syncReceitaIngredientes(data.id, payload.ingredientes);

    revalidatePath(RECEITAS_PATH);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar receita:', error);
    return { success: false, error: 'Erro ao criar receita' };
  }
}

export async function updateReceita(payload: ReceitaUpdateInput) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    if (payload.nome !== undefined && !payload.nome.trim()) {
      return { success: false, error: 'Nome não pode ser vazio' };
    }

    if (payload.ingredientes) {
      for (const ingrediente of payload.ingredientes) {
        if (!ingrediente.insumoId) {
          return { success: false, error: 'Selecione um insumo válido' };
        }
        if (ingrediente.quantidade <= 0) {
          return { success: false, error: 'Quantidade deve ser maior que zero' };
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (payload.nome !== undefined) updateData.nome = payload.nome.trim();
    if (payload.tipo !== undefined) updateData.tipo = payload.tipo;
    if (payload.codigo !== undefined) updateData.codigo = payload.codigo?.trim() || null;
    if (payload.ativo !== undefined) updateData.ativo = payload.ativo;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('receitas')
        .update(updateData)
        .eq('id', payload.id);

      if (error) throw error;
    }

    if (payload.ingredientes) {
      await syncReceitaIngredientes(payload.id, payload.ingredientes);
    }

    revalidatePath(RECEITAS_PATH);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar receita:', error);
    return { success: false, error: 'Erro ao atualizar receita' };
  }
}

export async function deleteReceita(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const { error } = await supabase
      .from('receitas')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    revalidatePath(RECEITAS_PATH);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar receita:', error);
    return { success: false, error: 'Erro ao deletar receita' };
  }
}

async function syncReceitaIngredientes(
  receitaId: string,
  ingredientes: ReceitaIngredienteInput[],
) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  // Remove todos os ingredientes atuais e recria (simplifica lógica)
  const { error: deleteError } = await supabase
    .from('receita_ingredientes')
    .delete()
    .eq('receita_id', receitaId);

  if (deleteError) throw deleteError;

  if (!ingredientes.length) {
    return;
  }

  const insertPayload = ingredientes.map((item) => ({
    receita_id: receitaId,
    insumo_id: item.insumoId,
    quantidade_padrao: item.quantidade,
  }));

  const { error: insertError } = await supabase
    .from('receita_ingredientes')
    .insert(insertPayload);

  if (insertError) throw insertError;
}

function validateReceitaPayload(payload: ReceitaInput) {
  if (!payload.nome.trim()) {
    throw new Error('Nome é obrigatório');
  }

  if (!payload.tipo) {
    throw new Error('Tipo de receita é obrigatório');
  }

  if (!payload.ingredientes || payload.ingredientes.length === 0) {
    throw new Error('Adicione ao menos um ingrediente');
  }

  payload.ingredientes.forEach((ingrediente) => {
    if (!ingrediente.insumoId) {
      throw new Error('Selecione um insumo válido');
    }
    if (ingrediente.quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }
  });
}


