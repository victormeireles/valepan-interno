'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

import { Database } from '@/types/database';

type TipoReceita = Database['public']['Enums']['tipo_receita'];

const PRODUTOS_PATH = '/produtos/receitas';

interface LinkReceitaPayload {
  produtoId: string;
  receitaId: string;
  quantidade: number;
}

export interface ProdutoResumoComReceitas {
  id: string;
  nome: string;
  codigo: string;
  receitas_vinculadas: {
    [key in TipoReceita]?: {
      id: string;
      receita_id: string;
      receita_nome: string;
      quantidade: number;
      ativo: boolean;
    };
  };
}

export async function getProdutosComReceitas() {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: produtos, error: produtosError } = await supabase
    .from('produtos')
    .select('id, nome, codigo')
    .eq('ativo', true)
    .order('nome');

  if (produtosError) {
    console.error('Erro ao buscar produtos:', produtosError);
    return [];
  }

  const { data: vinculos, error: vinculosError } = await supabase
    .from('produto_receitas')
    .select(`
      id,
      produto_id,
      receita_id,
      quantidade_por_produto,
      ativo,
      receitas (
        id,
        nome,
        tipo
      )
    `)
    .eq('ativo', true);

  if (vinculosError) {
    console.error('Erro ao buscar vínculos:', vinculosError);
    return [];
  }

  const produtosComReceitas: ProdutoResumoComReceitas[] = produtos.map((produto) => {
    const vinculosDoProduto = vinculos?.filter((v) => v.produto_id === produto.id) || [];
    const receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'] = {};

    vinculosDoProduto.forEach((vinculo) => {
      const receita = vinculo.receitas;
      if (receita) {
        receitasVinculadas[receita.tipo as TipoReceita] = {
          id: vinculo.id,
          receita_id: vinculo.receita_id,
          receita_nome: receita.nome,
          quantidade: vinculo.quantidade_por_produto,
          ativo: vinculo.ativo,
        };
      }
    });

    return {
      id: produto.id,
      nome: produto.nome,
      codigo: produto.codigo,
      receitas_vinculadas: receitasVinculadas,
    };
  });

  return produtosComReceitas;
}

export async function linkReceitaAoProduto(payload: LinkReceitaPayload) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    if (!payload.quantidade || payload.quantidade <= 0) {
      return { success: false, error: 'Quantidade deve ser maior que zero' };
    }

    const { data: receita, error: receitaError } = await supabase
      .from('receitas')
      .select('id, tipo, ativo')
      .eq('id', payload.receitaId)
      .single();

    if (receitaError || !receita) {
      return { success: false, error: 'Receita não encontrada' };
    }

    if (!receita.ativo) {
      return { success: false, error: 'Receita selecionada está inativa' };
    }

    // Verifica se já existe vínculo para o mesmo tipo
    // Busca todas as receitas vinculadas ao produto e verifica se alguma tem o mesmo tipo
    const { data: existingLinks, error: existingError } = await supabase
      .from('produto_receitas')
      .select(`
        id,
        receitas!inner(tipo)
      `)
      .eq('produto_id', payload.produtoId)
      .eq('ativo', true);
    
    if (existingError) throw existingError;
    
    const existing = existingLinks?.find(
      (link) => (link.receitas as { tipo: string })?.tipo === receita.tipo
    );

    if (existingError) throw existingError;

    if (existing) {
      const { error } = await supabase
        .from('produto_receitas')
        .update({
          receita_id: payload.receitaId,
          quantidade_por_produto: payload.quantidade,
          ativo: true,
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('produto_receitas').insert({
        produto_id: payload.produtoId,
        receita_id: payload.receitaId,
        quantidade_por_produto: payload.quantidade,
        ativo: true,
      });

      if (error) throw error;
    }

    revalidatePath(PRODUTOS_PATH);
    return { success: true };
  } catch (error) {
    console.error('Erro ao vincular receita ao produto:', error);
    return { success: false, error: 'Erro ao vincular receita ao produto' };
  }
}

export async function updateProdutoReceita(
  id: string,
  quantidade: number,
) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    if (quantidade <= 0) {
      return { success: false, error: 'Quantidade deve ser maior que zero' };
    }

    const { error } = await supabase
      .from('produto_receitas')
      .update({ quantidade_por_produto: quantidade })
      .eq('id', id);

    if (error) throw error;

    revalidatePath(PRODUTOS_PATH);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar vínculo de receita:', error);
    return { success: false, error: 'Erro ao atualizar vínculo de receita' };
  }
}

export async function unlinkProdutoReceita(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const { error } = await supabase
      .from('produto_receitas')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    revalidatePath(PRODUTOS_PATH);
    return { success: true };
  } catch (error) {
    console.error('Erro ao desativar vínculo de receita:', error);
    return { success: false, error: 'Erro ao desativar vínculo de receita' };
  }
}


