'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/database';

type TipoReceita = Database['interno']['Enums']['tipo_receita'];

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
    tipo?: TipoReceita;
    quantidade_por_produto: number;
    ativo: boolean;
    produtos: {
      id: string;
      nome: string;
    } | null;
  }>;
}

type ReceitaIngredienteDetalhe = ReceitaWithRelations['receita_ingredientes'][number];

/**
 * Ingredientes + insumo/unidade sem embed PostgREST (PGRST200 no schema `interno`).
 */
async function loadReceitaIngredientesDetalhados(
  supabase: SupabaseClient<Database>,
  receitaId: string,
): Promise<ReceitaIngredienteDetalhe[]> {
  const { data: rows, error } = await supabase
    .from('receita_ingredientes')
    .select('id, quantidade_padrao, insumo_id')
    .eq('receita_id', receitaId);

  if (error) {
    console.error('[loadReceitaIngredientesDetalhados]', error);
    return [];
  }
  if (!rows?.length) return [];

  const insumoIds = [...new Set(rows.map((r) => r.insumo_id).filter(Boolean))] as string[];
  if (insumoIds.length === 0) {
    return rows.map((r) => ({
      id: r.id,
      quantidade_padrao: r.quantidade_padrao,
      insumo_id: r.insumo_id,
      insumos: null,
    }));
  }

  const { data: insumosRows, error: insError } = await supabase
    .from('insumos')
    .select('id, nome, unidade_id')
    .in('id', insumoIds);

  if (insError) {
    console.error('[loadReceitaIngredientesDetalhados] insumos', insError);
    return rows.map((r) => ({
      id: r.id,
      quantidade_padrao: r.quantidade_padrao,
      insumo_id: r.insumo_id,
      insumos: null,
    }));
  }

  const unidadeIds = [
    ...new Set((insumosRows ?? []).map((i) => i.unidade_id).filter(Boolean)),
  ] as string[];

  const unidadesMap = new Map<
    string,
    { id: string; nome: string; nome_resumido: string; codigo: string }
  >();
  if (unidadeIds.length > 0) {
    const { data: unRows, error: unError } = await supabase
      .from('unidades')
      .select('id, nome, nome_resumido, codigo')
      .in('id', unidadeIds);
    if (unError) {
      console.error('[loadReceitaIngredientesDetalhados] unidades', unError);
    } else {
      for (const u of unRows ?? []) {
        unidadesMap.set(u.id, u);
      }
    }
  }

  const insumosMap = new Map<string, NonNullable<ReceitaIngredienteDetalhe['insumos']>>();
  for (const ins of insumosRows ?? []) {
    const unidade = ins.unidade_id ? (unidadesMap.get(ins.unidade_id) ?? null) : null;
    insumosMap.set(ins.id, {
      id: ins.id,
      nome: ins.nome,
      unidade_id: ins.unidade_id,
      unidades: unidade,
    });
  }

  return rows.map((r) => ({
    id: r.id,
    quantidade_padrao: r.quantidade_padrao,
    insumo_id: r.insumo_id,
    insumos: r.insumo_id ? (insumosMap.get(r.insumo_id) ?? null) : null,
  }));
}

const RECEITAS_PATH = '/receitas';

export async function getReceitas(includeInactive = false) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  let query = supabase
    .from('receitas')
    .select(`
      *,
      receita_ingredientes!receita_ingredientes_receita_id_fkey (
        id,
        quantidade_padrao,
        insumo_id,
        insumos!receita_ingredientes_insumo_id_fkey (
          id,
          nome,
          unidade_id,
          unidades!insumos_unidade_id_fkey (
            id,
            nome,
            nome_resumido,
            codigo
          )
        )
      ),
      produto_receitas!produto_receitas_receita_id_fkey (
        id,
        tipo,
        quantidade_por_produto,
        ativo,
        produtos!produto_receitas_produto_id_fkey (
          id,
          nome
        )
      )
    `)
    .order('nome', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    const pe = error as { message?: string; code?: string; details?: string; hint?: string };
    console.error(
      '[getReceitas]',
      pe?.code ?? 'no-code',
      pe?.message ?? String(error),
      pe?.details ? `details=${pe.details}` : '',
      pe?.hint ? `hint=${pe.hint}` : '',
    );
    return [];
  }

  return (data || []) as unknown as ReceitaWithRelations[];
}

export async function getReceitaDetalhes(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: receita, error } = await supabase.from('receitas').select('*').eq('id', id).single();

  if (error || !receita) {
    const pe = error as { message?: string; code?: string; details?: string; hint?: string } | null;
    console.error(
      '[getReceitaDetalhes]',
      pe?.code ?? 'no-code',
      pe?.message ?? String(error),
      pe?.details ? `details=${pe.details}` : '',
      pe?.hint ? `hint=${pe.hint}` : '',
    );
    return null;
  }

  const receita_ingredientes = await loadReceitaIngredientesDetalhados(supabase, id);

  return {
    ...receita,
    receita_ingredientes,
    produto_receitas: [],
  } as unknown as ReceitaWithRelations;
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


