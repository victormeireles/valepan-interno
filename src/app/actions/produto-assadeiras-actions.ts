'use server';

import { revalidatePath } from 'next/cache';
import type { Assadeira } from '@/app/actions/assadeiras-actions';
import {
  parseProdutoAssadeiraLinkForm,
  type ProdutoAssadeiraLinkFormInput,
} from '@/domain/assadeiras/produto-assadeira-validation';
import { assadeiraResolver } from '@/domain/assadeiras/assadeira-resolver';
import type { AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type AssadeiraOrigem = 'excecao' | 'regra' | 'pendente';

export type ProdutoComAssadeirasResumo = {
  id: string;
  nome: string;
  linkCount: number;
  assadeiraOrigem: AssadeiraOrigem;
  assadeiraResolvidaCount: number;
  semAssadeira: boolean;
};

export type ProdutoAssadeiraLink = {
  id: string;
  produto_id: string;
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  assadeira_nome: string;
  assadeira_padrao: number | null;
  assadeira_ativo: boolean;
  unidades_efetivas: number | null;
};

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const REVALIDATE_PATHS = ['/config/produtos', '/config/produto-assadeiras'] as const;

function revalidateProdutoConfigPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

type AssadeiraJoinRow = {
  nome: string | null;
  unidades_por_assadeira: number | null;
  ativo: boolean;
};

function mapAssadeiraJoin(
  assadeiras: AssadeiraJoinRow | AssadeiraJoinRow[] | null,
): AssadeiraJoinRow | null {
  if (!assadeiras) return null;
  return Array.isArray(assadeiras) ? (assadeiras[0] ?? null) : assadeiras;
}

export async function getProdutosComAssadeiras(): Promise<
  ProdutoComAssadeirasResumo[]
> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: produtos, error: produtosError } = await supabase
    .from('produtos')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (produtosError) {
    console.error('Erro ao buscar produtos:', produtosError);
    return [];
  }

  const { data: links, error: linksError } = await supabase
    .from('produto_assadeiras')
    .select('produto_id');

  if (linksError) {
    console.error('Erro ao buscar vínculos:', linksError);
    return (produtos ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      linkCount: 0,
      assadeiraOrigem: 'pendente' as const,
      assadeiraResolvidaCount: 0,
      semAssadeira: true,
    }));
  }

  const countByProduto = new Map<string, number>();
  for (const row of links ?? []) {
    countByProduto.set(
      row.produto_id,
      (countByProduto.get(row.produto_id) ?? 0) + 1,
    );
  }

  const produtosList = produtos ?? [];
  const regraCountByProduto = new Map<string, number>();

  await Promise.all(
    produtosList
      .filter((p) => (countByProduto.get(p.id) ?? 0) === 0)
      .map(async (p) => {
        const vinculos = await assadeiraResolver.resolveForProduto(p.id);
        regraCountByProduto.set(p.id, vinculos.length);
      }),
  );

  return produtosList.map((p) => {
    const linkCount = countByProduto.get(p.id) ?? 0;
    if (linkCount > 0) {
      return {
        id: p.id,
        nome: p.nome,
        linkCount,
        assadeiraOrigem: 'excecao' as const,
        assadeiraResolvidaCount: linkCount,
        semAssadeira: false,
      };
    }

    const regraCount = regraCountByProduto.get(p.id) ?? 0;
    if (regraCount > 0) {
      return {
        id: p.id,
        nome: p.nome,
        linkCount: 0,
        assadeiraOrigem: 'regra' as const,
        assadeiraResolvidaCount: regraCount,
        semAssadeira: false,
      };
    }

    return {
      id: p.id,
      nome: p.nome,
      linkCount: 0,
      assadeiraOrigem: 'pendente' as const,
      assadeiraResolvidaCount: 0,
      semAssadeira: true,
    };
  });
}

export async function getProdutoAssadeiraRegraPreview(
  produtoId: string,
): Promise<AssadeiraVinculoResolvido[]> {
  const links = await getProdutoAssadeiraLinks(produtoId);
  if (links.length > 0) return [];
  return assadeiraResolver.resolveForProduto(produtoId);
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
    .select(
      'id, produto_id, assadeira_id, unidades_por_assadeira, assadeiras(nome, unidades_por_assadeira, ativo)',
    )
    .eq('produto_id', produtoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar vínculos do produto:', error);
    return [];
  }

  return (data ?? []).map((row) => {
    const assadeira = mapAssadeiraJoin(
      row.assadeiras as AssadeiraJoinRow | AssadeiraJoinRow[] | null,
    );
    const assadeiraPadrao = assadeira?.unidades_por_assadeira ?? null;
    return {
      id: row.id,
      produto_id: row.produto_id,
      assadeira_id: row.assadeira_id,
      unidades_por_assadeira: row.unidades_por_assadeira,
      assadeira_nome: assadeira?.nome ?? 'Assadeira',
      assadeira_padrao: assadeiraPadrao,
      assadeira_ativo: assadeira?.ativo ?? false,
      unidades_efetivas: resolveUnidadesPorAssadeiraEfetiva({
        produto: row.unidades_por_assadeira,
        assadeira: assadeiraPadrao,
      }),
    };
  });
}

export async function createProdutoAssadeiraLink(
  input: ProdutoAssadeiraLinkFormInput,
): Promise<ActionResult> {
  const parsed = parseProdutoAssadeiraLinkForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { error } = await supabase.from('produto_assadeiras').insert({
    produto_id: parsed.data.produto_id,
    assadeira_id: parsed.data.assadeira_id,
    unidades_por_assadeira: parsed.data.unidades_por_assadeira,
  });

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

  revalidateProdutoConfigPaths();
  return { success: true };
}

export async function updateProdutoAssadeiraLink(
  id: string,
  input: Pick<
    ProdutoAssadeiraLinkFormInput,
    'usar_padrao' | 'unidades_por_assadeira'
  >,
): Promise<ActionResult> {
  const usarPadrao = input.usar_padrao ?? true;
  const unidades = usarPadrao ? null : (input.unidades_por_assadeira ?? null);

  if (!usarPadrao && (unidades == null || unidades < 1)) {
    return { success: false, error: 'Mínimo 1 pão por assadeira' };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { error } = await supabase
    .from('produto_assadeiras')
    .update({ unidades_por_assadeira: unidades })
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar vínculo:', error);
    return { success: false, error: 'Erro ao atualizar vínculo' };
  }

  revalidateProdutoConfigPaths();
  return { success: true };
}

export async function deleteAllProdutoAssadeiraLinks(
  produtoId: string,
): Promise<ActionResult<void>> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { error } = await supabase
    .from('produto_assadeiras')
    .delete()
    .eq('produto_id', produtoId);

  if (error) {
    console.error('Erro ao remover exceções do produto:', error);
    return { success: false, error: 'Erro ao remover exceções' };
  }

  revalidateProdutoConfigPaths();
  return { success: true };
}

export async function deleteProdutoAssadeiraLink(
  id: string,
): Promise<ActionResult<void>> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { error } = await supabase
    .from('produto_assadeiras')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao remover vínculo:', error);
    return { success: false, error: 'Erro ao remover vínculo' };
  }

  revalidateProdutoConfigPaths();
  return { success: true };
}
