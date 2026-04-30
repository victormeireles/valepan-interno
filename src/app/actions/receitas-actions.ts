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

type ReceitaRow = Database['public']['Tables']['receitas']['Row'];

/** Monta a mesma árvore que o embed PostgREST, sem `unidades`/`insumos` aninhados (compatível com schema `interno`). */
async function hydrateReceitasWithRelations(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  receitas: ReceitaRow[],
): Promise<ReceitaWithRelations[]> {
  if (receitas.length === 0) return [];

  const rids = receitas.map((r) => r.id);

  const { data: allIngs } = await supabase
    .from('receita_ingredientes')
    .select('id, receita_id, quantidade_padrao, insumo_id')
    .in('receita_id', rids);

  const insumoIds = [
    ...new Set((allIngs ?? []).map((i) => i.insumo_id).filter((id): id is string => Boolean(id?.trim()))),
  ];
  const { data: allInsumos } = await supabase
    .from('insumos')
    .select('id, nome, unidade_id')
    .in('id', insumoIds);

  const unidadeIds = [
    ...new Set((allInsumos ?? []).map((i) => i.unidade_id).filter((id): id is string => Boolean(id?.trim()))),
  ];
  const { data: allUnidades } = await supabase
    .from('unidades')
    .select('id, nome, nome_resumido, codigo')
    .in('id', unidadeIds);

  const uMap = new Map((allUnidades ?? []).map((u) => [u.id, u]));
  const insMap = new Map(
    (allInsumos ?? []).map((ins) => {
      const u = ins.unidade_id ? uMap.get(ins.unidade_id) : undefined;
      return [
        ins.id,
        {
          id: ins.id,
          nome: ins.nome,
          unidade_id: ins.unidade_id,
          unidades: u
            ? {
                id: u.id,
                nome: u.nome,
                nome_resumido: u.nome_resumido,
                codigo: u.codigo,
              }
            : null,
        },
      ] as const;
    }),
  );

  const ingsByReceita = new Map<string, NonNullable<typeof allIngs>>();
  for (const ing of allIngs ?? []) {
    if (!ing.receita_id) continue;
    const list = ingsByReceita.get(ing.receita_id) ?? [];
    list.push(ing);
    ingsByReceita.set(ing.receita_id, list);
  }

  const { data: allPr } = await supabase
    .from('produto_receitas')
    .select('id, receita_id, produto_id, quantidade_por_produto, ativo')
    .in('receita_id', rids);

  const produtoIds = [
    ...new Set((allPr ?? []).map((p) => p.produto_id).filter((id): id is string => Boolean(id?.trim()))),
  ];
  const { data: allProds } = await supabase.from('produtos').select('id, nome').in('id', produtoIds);
  const pMap = new Map((allProds ?? []).map((p) => [p.id, p]));

  const prByReceita = new Map<string, NonNullable<typeof allPr>>();
  for (const pr of allPr ?? []) {
    const list = prByReceita.get(pr.receita_id) ?? [];
    list.push(pr);
    prByReceita.set(pr.receita_id, list);
  }

  return receitas.map((rec) => {
    const ings = ingsByReceita.get(rec.id) ?? [];
    const receita_ingredientes = ings.map((ing) => ({
      id: ing.id,
      quantidade_padrao: ing.quantidade_padrao,
      insumo_id: ing.insumo_id,
      insumos: ing.insumo_id ? (insMap.get(ing.insumo_id) ?? null) : null,
    }));

    const prs = prByReceita.get(rec.id) ?? [];
    const produto_receitas = prs.map((pr) => ({
      id: pr.id,
      tipo: rec.tipo as TipoReceita,
      quantidade_por_produto: pr.quantidade_por_produto,
      ativo: Boolean(pr.ativo),
      produtos: pMap.get(pr.produto_id) ? { id: pr.produto_id, nome: pMap.get(pr.produto_id)!.nome } : null,
    }));

    return {
      ...rec,
      receita_ingredientes,
      produto_receitas,
    } as ReceitaWithRelations;
  });
}

export async function getReceitas(includeInactive = false) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  let query = supabase.from('receitas').select('*').order('nome', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar receitas:', error);
    return [];
  }

  return hydrateReceitasWithRelations(supabase, data ?? []);
}

export async function getReceitaDetalhes(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase.from('receitas').select('*').eq('id', id).single();

  if (error) {
    console.error('Erro ao buscar receita:', error);
    return null;
  }

  if (!data) return null;

  const [detail] = await hydrateReceitasWithRelations(supabase, [data]);
  return detail ?? null;
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


