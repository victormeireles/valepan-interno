import {
  buildRegraAssadeiraIndex,
  countRegraVinculosForProduto,
  resolveRegraVinculosForProduto,
  type RegraAssadeiraRow,
} from '@/domain/assadeiras/produto-assadeira-regra-index';
import type {
  ProdutoComAssadeirasResumo,
} from '@/domain/assadeiras/produto-assadeira-types';
import type { AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';
import { resolvePesoGramas } from '@/domain/assadeiras/produto-peso';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const PRODUTO_SELECT =
  'id, nome, categoria_id, unit_weight, categorias(nome)';

const REGRA_SELECT =
  'categoria_id, peso_g, assadeira_id, unidades_por_assadeira, assadeiras(nome, unidades_por_assadeira, ativo)';

type ProdutoRow = {
  id: string;
  nome: string;
  categoria_id: string;
  unit_weight: number | null;
  categorias: { nome: string } | { nome: string }[] | null;
};

function unwrapJoin<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapProdutoCategoria(produto: ProdutoRow): Pick<
  ProdutoComAssadeirasResumo,
  'categoria_id' | 'categoria_nome'
> {
  const categoria = unwrapJoin(produto.categorias);
  return {
    categoria_id: produto.categoria_id,
    categoria_nome: categoria?.nome ?? 'Sem categoria',
  };
}

function buildResumo(
  produto: ProdutoRow,
  linkCount: number,
  regraIndex: Map<string, RegraAssadeiraRow[]>,
): ProdutoComAssadeirasResumo {
  const base = {
    id: produto.id,
    nome: produto.nome,
    unit_weight: produto.unit_weight,
    ...mapProdutoCategoria(produto),
  };

  if (linkCount > 0) {
    return {
      ...base,
      linkCount,
      assadeiraOrigem: 'excecao',
      assadeiraResolvidaCount: linkCount,
      semAssadeira: false,
    };
  }

  const regraCount = countRegraVinculosForProduto(produto, regraIndex);
  if (regraCount > 0) {
    return {
      ...base,
      linkCount: 0,
      assadeiraOrigem: 'regra',
      assadeiraResolvidaCount: regraCount,
      semAssadeira: false,
    };
  }

  return {
    ...base,
    linkCount: 0,
    assadeiraOrigem: 'pendente',
    assadeiraResolvidaCount: 0,
    semAssadeira: true,
  };
}

export class ProdutoAssadeiraResumoManager {
  async loadAll(): Promise<ProdutoComAssadeirasResumo[]> {
    const supabase = supabaseClientFactory.createServiceRoleClient();

    const [produtosResult, linksResult, regrasResult] = await Promise.all([
      supabase
        .from('produtos')
        .select(PRODUTO_SELECT)
        .eq('ativo', true)
        .order('nome', { ascending: true }),
      supabase.from('produto_assadeiras').select('produto_id'),
      supabase
        .from('categoria_assadeira_regras')
        .select(REGRA_SELECT)
        .eq('ativo', true),
    ]);

    if (produtosResult.error) {
      console.error('Erro ao buscar produtos:', produtosResult.error);
      return [];
    }

    const countByProduto = new Map<string, number>();
    if (!linksResult.error) {
      for (const row of linksResult.data ?? []) {
        countByProduto.set(
          row.produto_id,
          (countByProduto.get(row.produto_id) ?? 0) + 1,
        );
      }
    } else {
      console.error('Erro ao buscar vínculos:', linksResult.error);
    }

    if (regrasResult.error) {
      console.error('Erro ao buscar regras de assadeira:', regrasResult.error);
    }

    const regraIndex = buildRegraAssadeiraIndex(
      (regrasResult.data ?? []) as RegraAssadeiraRow[],
    );

    return ((produtosResult.data ?? []) as ProdutoRow[]).map((produto) =>
      buildResumo(produto, countByProduto.get(produto.id) ?? 0, regraIndex),
    );
  }

  async loadOne(produtoId: string): Promise<ProdutoComAssadeirasResumo | null> {
    const supabase = supabaseClientFactory.createServiceRoleClient();

    const [produtoResult, linksResult] = await Promise.all([
      supabase
        .from('produtos')
        .select(PRODUTO_SELECT)
        .eq('id', produtoId)
        .eq('ativo', true)
        .maybeSingle(),
      supabase
        .from('produto_assadeiras')
        .select('id', { count: 'exact', head: true })
        .eq('produto_id', produtoId),
    ]);

    if (produtoResult.error || !produtoResult.data) {
      if (produtoResult.error) {
        console.error('Erro ao buscar produto:', produtoResult.error);
      }
      return null;
    }

    const produto = produtoResult.data as ProdutoRow;
    const linkCount = linksResult.count ?? 0;
    if (linkCount > 0) {
      return buildResumo(produto, linkCount, new Map());
    }

    const regraIndex = await this.loadRegraIndexForProduto(produto);
    return buildResumo(produto, 0, regraIndex);
  }

  async loadRegraPreview(produtoId: string): Promise<AssadeiraVinculoResolvido[]> {
    const supabase = supabaseClientFactory.createServiceRoleClient();

    const [linkCountResult, produtoResult] = await Promise.all([
      supabase
        .from('produto_assadeiras')
        .select('id', { count: 'exact', head: true })
        .eq('produto_id', produtoId),
      supabase
        .from('produtos')
        .select('categoria_id, unit_weight, nome')
        .eq('id', produtoId)
        .maybeSingle(),
    ]);

    if ((linkCountResult.count ?? 0) > 0) return [];
    if (!produtoResult.data) return [];

    const regraIndex = await this.loadRegraIndexForProduto(
      produtoResult.data as ProdutoRow,
    );

    return resolveRegraVinculosForProduto(
      produtoResult.data as ProdutoRow,
      regraIndex,
    );
  }

  private async loadRegraIndexForProduto(
    produto: ProdutoRow,
  ): Promise<Map<string, RegraAssadeiraRow[]>> {
    const pesoG = resolvePesoGramas({
      unit_weight: produto.unit_weight,
      nome: produto.nome,
    });
    if (pesoG == null) return new Map();

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('categoria_assadeira_regras')
      .select(REGRA_SELECT)
      .eq('categoria_id', produto.categoria_id)
      .eq('peso_g', pesoG)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao buscar regras de assadeira:', error);
      return new Map();
    }

    return buildRegraAssadeiraIndex((data ?? []) as RegraAssadeiraRow[]);
  }
}

export const produtoAssadeiraResumoManager = new ProdutoAssadeiraResumoManager();
