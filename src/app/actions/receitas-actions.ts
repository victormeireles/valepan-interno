'use server';

import { receitaGramaturaVinculosSyncManager } from '@/domain/receitas/receita-gramatura-vinculos-sync-manager';
import type { ReceitaGramaturaVinculoSyncResult } from '@/domain/receitas/receita-gramatura-vinculos-sync-manager';
import { receitaMassaVinculosSyncManager } from '@/domain/receitas/receita-massa-vinculos-sync-manager';
import type { ReceitaMassaVinculoSyncResult } from '@/domain/receitas/receita-massa-vinculos-sync-manager';
import { receitaTipoUsaGramatura, receitaTipoUsaCalculoCoeficienteGramatura, receitaTipoUsaGramaturaDireta } from '@/domain/receitas/receita-gramatura-resolver';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/database';

type TipoReceita = Database['public']['Enums']['tipo_receita'];

export interface ReceitaIngredienteInput {
  id?: string;
  insumoId: string;
  quantidade: number;
}

export interface ReceitaGramaturaInput {
  id?: string;
  pesoG: number;
  quantidade: number;
}

export interface ReceitaInput {
  nome: string;
  tipo: TipoReceita;
  ativo?: boolean;
  ingredientes: ReceitaIngredienteInput[];
  gramaturas?: ReceitaGramaturaInput[];
}

export interface ReceitaUpdateInput extends Partial<ReceitaInput> {
  id: string;
}

export interface ReceitaWithRelations {
  id: string;
  nome: string;
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
      custo_unitario: number;
      unidade_id: string;
      unidades: {
        id: string;
        nome: string;
        nome_resumido: string;
        codigo: string;
      } | null;
    } | null;
  }>;
  receita_gramaturas?: Array<{
    id: string;
    peso_g: number;
    quantidade_padrao: number;
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

const RECEITAS_PATH = '/config/receitas';
const PRODUTOS_PATH = '/config/produtos';

export type ReceitaSaveSuccess = {
  success: true;
  vinculosMassa?: ReceitaMassaVinculoSyncResult;
  vinculosGramatura?: ReceitaGramaturaVinculoSyncResult;
};

export type ReceitaSaveFailure = {
  success: false;
  error: string;
};

export type ReceitaSaveResult = ReceitaSaveSuccess | ReceitaSaveFailure;

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
          custo_unitario,
          unidade_id,
          unidades (
            id,
            nome,
            nome_resumido,
            codigo
          )
        )
      ),
      receita_gramaturas (
        id,
        peso_g,
        quantidade_padrao
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
          custo_unitario,
          unidade_id,
          unidades (
            id,
            nome,
            nome_resumido,
            codigo
          )
        )
      ),
      receita_gramaturas (
        id,
        peso_g,
        quantidade_padrao
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

export async function createReceita(payload: ReceitaInput): Promise<ReceitaSaveResult> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    validateReceitaPayload(payload);

    const { data, error } = await supabase
      .from('receitas')
      .insert({
        nome: payload.nome.trim(),
        tipo: payload.tipo,
        ativo: payload.ativo ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    await syncReceitaIngredientes(data.id, payload.ingredientes);

    if (payload.gramaturas && receitaTipoUsaGramatura(payload.tipo)) {
      await syncReceitaGramaturas(data.id, payload.gramaturas);
    }

    revalidatePath(RECEITAS_PATH);
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar receita:', error);
    return { success: false, error: 'Erro ao criar receita' };
  }
}

export async function updateReceita(payload: ReceitaUpdateInput): Promise<ReceitaSaveResult> {
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

    if (payload.gramaturas) {
      validateReceitaGramaturas(payload.gramaturas);
    }

    const { data: receitaAtual, error: receitaAtualError } = await supabase
      .from('receitas')
      .select('tipo')
      .eq('id', payload.id)
      .single();

    if (receitaAtualError || !receitaAtual) {
      return { success: false, error: 'Receita não encontrada' };
    }

    const tipoEfetivo = payload.tipo ?? receitaAtual.tipo;

    const updateData: Record<string, unknown> = {};
    if (payload.nome !== undefined) updateData.nome = payload.nome.trim();
    if (payload.tipo !== undefined) updateData.tipo = payload.tipo;
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

    if (payload.gramaturas !== undefined && receitaTipoUsaGramatura(tipoEfetivo)) {
      await syncReceitaGramaturas(payload.id, payload.gramaturas);
    } else if (tipoEfetivo === 'massa') {
      await syncReceitaGramaturas(payload.id, []);
    }

    let vinculosMassa: ReceitaMassaVinculoSyncResult | undefined;
    let vinculosGramatura: ReceitaGramaturaVinculoSyncResult | undefined;

    if (tipoEfetivo === 'massa' && payload.ingredientes) {
      vinculosMassa = await receitaMassaVinculosSyncManager.syncByReceitaId(payload.id);
      revalidatePath(PRODUTOS_PATH);
    }

    if (
      (receitaTipoUsaGramaturaDireta(tipoEfetivo) && payload.gramaturas !== undefined) ||
      (receitaTipoUsaCalculoCoeficienteGramatura(tipoEfetivo) &&
        (payload.gramaturas !== undefined || payload.ingredientes))
    ) {
      vinculosGramatura = await receitaGramaturaVinculosSyncManager.syncByReceitaId(payload.id);
      revalidatePath(PRODUTOS_PATH);
    }

    revalidatePath(RECEITAS_PATH);
    return { success: true, vinculosMassa, vinculosGramatura };
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

async function syncReceitaGramaturas(
  receitaId: string,
  gramaturas: ReceitaGramaturaInput[],
) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error: deleteError } = await supabase
    .from('receita_gramaturas')
    .delete()
    .eq('receita_id', receitaId);

  if (deleteError) throw deleteError;

  if (!gramaturas.length) return;

  const insertPayload = gramaturas.map((item) => ({
    receita_id: receitaId,
    peso_g: item.pesoG,
    quantidade_padrao: item.quantidade,
  }));

  const { error: insertError } = await supabase
    .from('receita_gramaturas')
    .insert(insertPayload);

  if (insertError) throw insertError;
}

function validateReceitaGramaturas(gramaturas: ReceitaGramaturaInput[]) {
  const pesos = new Set<number>();

  gramaturas.forEach((item) => {
    if (!Number.isInteger(item.pesoG) || item.pesoG < 1) {
      throw new Error('Gramatura deve ser um número inteiro em gramas (mínimo 1)');
    }
    if (item.quantidade <= 0) {
      throw new Error('Quantidade padrão deve ser maior que zero');
    }
    if (pesos.has(item.pesoG)) {
      throw new Error(`Gramatura ${item.pesoG}g duplicada`);
    }
    pesos.add(item.pesoG);
  });
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

  if (payload.gramaturas?.length) {
    validateReceitaGramaturas(payload.gramaturas);
  }
}


