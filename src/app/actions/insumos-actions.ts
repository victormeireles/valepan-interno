'use server';

import type { IntegracaoInsumoComEmpresa } from '@/domain/types/insumo-estoque-db';
import { insumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { receitaIngredienteRepository } from '@/data/receitas/ReceitaIngredienteRepository';
import { insumoDeleteManager } from '@/domain/insumos/insumo-delete-manager';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

export interface Insumo {
  id: string;
  nome: string;
  custo_unitario: number | null;
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
  custo_unitario: number | null;
  unidade_id: string;
  ativo?: boolean;
}

interface UpdateInsumoParams {
  id: string;
  nome?: string;
  custo_unitario?: number | null;
  unidade_id?: string;
  ativo?: boolean;
}

export async function getInsumos(includeInactive = false) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  let query = supabase
    .from('insumos')
    .select(`
      *,
      unidades (
        id,
        nome,
        nome_resumido,
        codigo
      )
    `)
    .order('nome', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar insumos:', error);
    return [];
  }

  return (data || []) as Insumo[];
}

export async function getIntegracoesInsumo(insumoId: string) {
  try {
    return await insumoMapeamentoRepository.listByInsumo(insumoId);
  } catch (error) {
    console.error('Erro ao buscar vínculos Omie do insumo:', error);
    return [];
  }
}

export async function getVinculosOmieAssociadosPorInsumos(): Promise<
  Record<string, IntegracaoInsumoComEmpresa[]>
> {
  try {
    return await insumoMapeamentoRepository.listVinculosAgrupadosPorInsumo();
  } catch (error) {
    console.error('Erro ao buscar vínculos Omie dos insumos:', error);
    return {};
  }
}

export async function getReceitasAssociadasPorInsumos(): Promise<
  Record<string, InsumoReceitaAssociacao[]>
> {
  try {
    return await receitaIngredienteRepository.listAssociacoesAgrupadasPorInsumo();
  } catch (error) {
    console.error('Erro ao buscar receitas dos insumos:', error);
    return {};
  }
}

export async function getReceitasPorInsumo(insumoId: string): Promise<InsumoReceitaAssociacao[]> {
  try {
    return await receitaIngredienteRepository.listAssociacoesPorInsumo(insumoId);
  } catch (error) {
    console.error('Erro ao buscar receitas do insumo:', error);
    return [];
  }
}

export async function getInsumoById(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('insumos')
    .select(`
      *,
      unidades (
        id,
        nome,
        nome_resumido,
        codigo
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar insumo:', error);
    return null;
  }

  return data as Insumo | null;
}

export async function createInsumo(params: CreateInsumoParams) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    // Validações
    if (!params.nome || params.nome.trim().length === 0) {
      return { success: false, error: 'Nome é obrigatório' };
    }

    if (params.custo_unitario != null && params.custo_unitario < 0) {
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

    revalidatePath('/config/insumos');
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
      if (params.custo_unitario != null && params.custo_unitario < 0) {
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

    revalidatePath('/config/insumos');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar insumo:', error);
    return { success: false, error: 'Erro ao atualizar insumo' };
  }
}

export async function deleteInsumo(id: string) {
  const result = await insumoDeleteManager.delete(id);

  if (result.success) {
    revalidatePath('/config/insumos');
  }

  return result;
}













