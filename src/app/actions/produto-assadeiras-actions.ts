'use server';

import { revalidatePath } from 'next/cache';
import type { Assadeira } from '@/app/actions/assadeiras-actions';
import { mapProdutoAssadeiraLinkRow } from '@/domain/assadeiras/produto-assadeira-link-mapper';
import {
  produtoAssadeiraResumoManager,
} from '@/domain/assadeiras/produto-assadeira-resumo-manager';
import type {
  ProdutoAssadeiraLink,
  ProdutoComAssadeirasResumo,
} from '@/domain/assadeiras/produto-assadeira-types';
import {
  parseProdutoAssadeiraLinkForm,
  type ProdutoAssadeiraLinkFormInput,
} from '@/domain/assadeiras/produto-assadeira-validation';
import type { AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type LinkMutationResult =
  | { success: true; link: ProdutoAssadeiraLink; produto: ProdutoComAssadeirasResumo }
  | { success: false; error: string };

type ProdutoMutationResult =
  | { success: true; produto: ProdutoComAssadeirasResumo }
  | { success: false; error: string };

const REVALIDATE_PATHS = ['/config/produtos', '/config/produto-assadeiras'] as const;

const LINK_SELECT =
  'id, produto_id, assadeira_id, unidades_por_assadeira, ordem, assadeiras(nome, unidades_por_assadeira, ativo)';

function revalidateProdutoConfigPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function getProdutosComAssadeiras(): Promise<
  ProdutoComAssadeirasResumo[]
> {
  return produtoAssadeiraResumoManager.loadAll();
}

export async function getProdutoAssadeiraResumo(
  produtoId: string,
): Promise<ProdutoComAssadeirasResumo | null> {
  return produtoAssadeiraResumoManager.loadOne(produtoId);
}

export async function getProdutoAssadeiraRegraPreview(
  produtoId: string,
): Promise<AssadeiraVinculoResolvido[]> {
  return produtoAssadeiraResumoManager.loadRegraPreview(produtoId);
}

export async function getAssadeirasAtivas(): Promise<Assadeira[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('assadeiras')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar assadeiras ativas:', error);
    return [];
  }
  return (data ?? []) as Assadeira[];
}

export async function getProdutoAssadeiraLinks(
  produtoId: string,
): Promise<ProdutoAssadeiraLink[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .select(LINK_SELECT)
    .eq('produto_id', produtoId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar vínculos do produto:', error);
    return [];
  }

  return (data ?? []).map((row) => mapProdutoAssadeiraLinkRow(row));
}

export async function createProdutoAssadeiraLink(
  input: ProdutoAssadeiraLinkFormInput,
): Promise<LinkMutationResult> {
  const parsed = parseProdutoAssadeiraLinkForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .insert({
      produto_id: parsed.data.produto_id,
      assadeira_id: parsed.data.assadeira_id,
      unidades_por_assadeira: parsed.data.unidades_por_assadeira,
      ordem: parsed.data.ordem,
    })
    .select(LINK_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Este produto já usa esta assadeira',
      };
    }
    console.error('Erro ao criar vínculo:', error);
    return { success: false, error: 'Erro ao vincular assadeira' };
  }

  const produto = await produtoAssadeiraResumoManager.loadOne(parsed.data.produto_id);
  if (!produto) {
    return { success: false, error: 'Produto não encontrado após vincular assadeira' };
  }

  revalidateProdutoConfigPaths();
  return {
    success: true,
    link: mapProdutoAssadeiraLinkRow(data),
    produto,
  };
}

export async function updateProdutoAssadeiraLink(
  id: string,
  input: Pick<
    ProdutoAssadeiraLinkFormInput,
    'usar_padrao' | 'unidades_por_assadeira' | 'ordem'
  >,
): Promise<LinkMutationResult> {
  const usarPadrao = input.usar_padrao ?? true;
  const unidades = usarPadrao ? null : (input.unidades_por_assadeira ?? null);

  if (!usarPadrao && (unidades == null || unidades < 1)) {
    return { success: false, error: 'Mínimo 1 pão por assadeira' };
  }

  if (input.ordem != null && (!Number.isInteger(input.ordem) || input.ordem < 0)) {
    return { success: false, error: 'Ordem deve ser um inteiro ≥ 0' };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .update({
      unidades_por_assadeira: unidades,
      ...(input.ordem != null ? { ordem: input.ordem } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(LINK_SELECT)
    .single();

  if (error) {
    console.error('Erro ao atualizar vínculo:', error);
    return { success: false, error: 'Erro ao atualizar vínculo' };
  }

  const produto = await produtoAssadeiraResumoManager.loadOne(data.produto_id);
  if (!produto) {
    return { success: false, error: 'Produto não encontrado após atualizar vínculo' };
  }

  revalidateProdutoConfigPaths();
  return {
    success: true,
    link: mapProdutoAssadeiraLinkRow(data),
    produto,
  };
}

export async function deleteAllProdutoAssadeiraLinks(
  produtoId: string,
): Promise<ProdutoMutationResult> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .delete()
    .eq('produto_id', produtoId)
    .select('id');

  if (error) {
    console.error('Erro ao remover exceções do produto:', error);
    return { success: false, error: 'Erro ao remover exceções' };
  }

  if (!data?.length) {
    return { success: false, error: 'Nenhuma exceção encontrada para este produto' };
  }

  const produto = await produtoAssadeiraResumoManager.loadOne(produtoId);
  if (!produto) {
    return { success: false, error: 'Produto não encontrado após remover exceções' };
  }

  revalidateProdutoConfigPaths();
  return { success: true, produto };
}

export async function deleteProdutoAssadeiraLink(
  id: string,
): Promise<ProdutoMutationResult> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from('produto_assadeiras')
    .select('produto_id')
    .eq('id', id)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: 'Vínculo não encontrado ou já removido' };
  }

  const { data, error } = await supabase
    .from('produto_assadeiras')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('Erro ao remover vínculo:', error);
    return { success: false, error: 'Erro ao remover vínculo' };
  }

  if (!data?.length) {
    return { success: false, error: 'Vínculo não encontrado ou já removido' };
  }

  const produto = await produtoAssadeiraResumoManager.loadOne(existing.produto_id);
  if (!produto) {
    return { success: false, error: 'Produto não encontrado após remover vínculo' };
  }

  revalidateProdutoConfigPaths();
  return { success: true, produto };
}
