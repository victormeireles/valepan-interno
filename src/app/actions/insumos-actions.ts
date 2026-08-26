'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

import type { IntegracaoInsumoComEmpresa } from '@/domain/types/insumo-estoque-db';
import { insumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { receitaIngredienteRepository } from '@/data/receitas/ReceitaIngredienteRepository';
import { validateInsumoConversaoParams } from '@/domain/insumos/insumo-conversao-params';
import { insumoDeleteManager } from '@/domain/insumos/insumo-delete-manager';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

type UnidadeResumo = {
  id: string;
  nome: string;
  nome_resumido: string;
  codigo: string;
};

export interface Insumo {
  id: string;
  nome: string;
  custo_unitario: number | null;
  unidade_id: string;
  conversao_unidade_id?: string | null;
  conversao_fator?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  unidades?: UnidadeResumo;
  conversao_unidades?: UnidadeResumo | null;
}

interface CreateInsumoParams {
  nome: string;
  custo_unitario: number | null;
  unidade_id: string;
  conversao_unidade_id?: string | null;
  conversao_fator?: number | null;
  ativo?: boolean;
}

interface UpdateInsumoParams {
  id: string;
  nome?: string;
  custo_unitario?: number | null;
  unidade_id?: string;
  conversao_unidade_id?: string | null;
  conversao_fator?: number | null;
  ativo?: boolean;
}

const INSUMO_SELECT = `
  *,
  unidades!insumos_unidade_id_fkey (
    id,
    nome,
    nome_resumido,
    codigo
  ),
  conversao_unidades:unidades!insumos_conversao_unidade_id_fkey (
    id,
    nome,
    nome_resumido,
    codigo
  )
`;

export async function getInsumos(includeInactive = false) {
  await requireInternoModulo('interno_config', 'ler');
  const supabase = supabaseClientFactory.createServiceRoleClient();

  let query = supabase
    .from('insumos')
    .select(INSUMO_SELECT)
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
  await requireInternoModulo('interno_config', 'ler');
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
  await requireInternoModulo('interno_config', 'ler');
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
  await requireInternoModulo('interno_config', 'ler');
  try {
    return await receitaIngredienteRepository.listAssociacoesAgrupadasPorInsumo();
  } catch (error) {
    console.error('Erro ao buscar receitas dos insumos:', error);
    return {};
  }
}

export async function getReceitasPorInsumo(insumoId: string): Promise<InsumoReceitaAssociacao[]> {
  await requireInternoModulo('interno_config', 'ler');
  try {
    return await receitaIngredienteRepository.listAssociacoesPorInsumo(insumoId);
  } catch (error) {
    console.error('Erro ao buscar receitas do insumo:', error);
    return [];
  }
}

export async function getInsumoById(id: string) {
  await requireInternoModulo('interno_config', 'ler');
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('insumos')
    .select(INSUMO_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar insumo:', error);
    return null;
  }

  return data as Insumo | null;
}

export async function createInsumo(params: CreateInsumoParams) {
  await requireInternoModulo('interno_config', 'administrar');
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

    const conversao = validateInsumoConversaoParams({
      unidadeId: params.unidade_id,
      conversaoUnidadeId: params.conversao_unidade_id,
      conversaoFator: params.conversao_fator,
    });
    if (!conversao.ok) {
      return { success: false, error: conversao.error };
    }

    const { data, error } = await supabase
      .from('insumos')
      .insert({
        nome: params.nome.trim(),
        custo_unitario: params.custo_unitario,
        unidade_id: params.unidade_id,
        conversao_unidade_id: conversao.conversaoUnidadeId,
        conversao_fator: conversao.conversaoFator,
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
  await requireInternoModulo('interno_config', 'administrar');
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

    const touchesConversao =
      params.conversao_unidade_id !== undefined ||
      params.conversao_fator !== undefined ||
      params.unidade_id !== undefined;

    if (touchesConversao) {
      const { data: atual, error: atualError } = await supabase
        .from('insumos')
        .select('unidade_id, conversao_unidade_id, conversao_fator')
        .eq('id', params.id)
        .single();

      if (atualError || !atual) {
        return { success: false, error: 'Insumo não encontrado' };
      }

      const unidadeId = params.unidade_id ?? atual.unidade_id;
      const conversao = validateInsumoConversaoParams({
        unidadeId,
        conversaoUnidadeId:
          params.conversao_unidade_id !== undefined
            ? params.conversao_unidade_id
            : atual.conversao_unidade_id,
        conversaoFator:
          params.conversao_fator !== undefined
            ? params.conversao_fator
            : atual.conversao_fator != null
              ? Number(atual.conversao_fator)
              : null,
      });
      if (!conversao.ok) {
        return { success: false, error: conversao.error };
      }

      updateData.conversao_unidade_id = conversao.conversaoUnidadeId;
      updateData.conversao_fator = conversao.conversaoFator;
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
  await requireInternoModulo('interno_config', 'administrar');
  const result = await insumoDeleteManager.delete(id);

  if (result.success) {
    revalidatePath('/config/insumos');
  }

  return result;
}













