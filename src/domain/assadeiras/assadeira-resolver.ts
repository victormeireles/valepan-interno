import {
  buildVinculoResolvido,
  mapAssadeiraJoin,
} from '@/domain/assadeiras/assadeira-vinculo-builder';
import type { AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';
import { resolvePesoGramas } from '@/domain/assadeiras/produto-peso';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type {
  AssadeiraVinculoOrigem,
  AssadeiraVinculoResolvido,
} from '@/domain/assadeiras/assadeira-resolver-types';

type AssadeiraJoin = {
  nome: string | null;
  unidades_por_assadeira: number | null;
  ativo: boolean;
};

type ExcecaoRow = {
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  assadeiras: AssadeiraJoin | AssadeiraJoin[] | null;
};

type RegraRow = {
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  assadeiras: AssadeiraJoin | AssadeiraJoin[] | null;
};

type ProdutoRow = {
  categoria_id: string;
  unit_weight: number | null;
  nome: string;
};

export class AssadeiraResolver {
  async resolveForProduto(produtoId: string): Promise<AssadeiraVinculoResolvido[]> {
    const excecoes = await this.loadExcecoes(produtoId);
    if (excecoes.length > 0) return excecoes;

    const produto = await this.loadProduto(produtoId);
    if (!produto) return [];

    const pesoG = resolvePesoGramas({
      unit_weight: produto.unit_weight,
      nome: produto.nome,
    });
    if (pesoG == null) return [];

    return this.loadRegras(produto.categoria_id, pesoG);
  }

  async resolveDefaultForProduto(
    produtoId: string,
  ): Promise<AssadeiraVinculoResolvido | null> {
    const list = await this.resolveForProduto(produtoId);
    return list[0] ?? null;
  }

  private async loadExcecoes(produtoId: string): Promise<AssadeiraVinculoResolvido[]> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('produto_assadeiras')
      .select(
        'assadeira_id, unidades_por_assadeira, assadeiras(nome, unidades_por_assadeira, ativo)',
      )
      .eq('produto_id', produtoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar exceções de assadeira:', error);
      return [];
    }

    return ((data ?? []) as ExcecaoRow[])
      .map((row) =>
        buildVinculoResolvido(
          row.assadeira_id,
          mapAssadeiraJoin(row.assadeiras),
          row.unidades_por_assadeira,
          'excecao',
        ),
      )
      .filter((row): row is AssadeiraVinculoResolvido => row != null);
  }

  private async loadProduto(produtoId: string): Promise<ProdutoRow | null> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('produtos')
      .select('categoria_id, unit_weight, nome')
      .eq('id', produtoId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar produto para resolver assadeira:', error);
      return null;
    }
    return data as ProdutoRow | null;
  }

  private async loadRegras(
    categoriaId: string,
    pesoG: number,
  ): Promise<AssadeiraVinculoResolvido[]> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('categoria_assadeira_regras')
      .select(
        'assadeira_id, unidades_por_assadeira, assadeiras(nome, unidades_por_assadeira, ativo)',
      )
      .eq('categoria_id', categoriaId)
      .eq('peso_g', pesoG)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar regras de assadeira:', error);
      return [];
    }

    return ((data ?? []) as RegraRow[])
      .map((row) =>
        buildVinculoResolvido(
          row.assadeira_id,
          mapAssadeiraJoin(row.assadeiras),
          row.unidades_por_assadeira,
          'regra',
        ),
      )
      .filter((row): row is AssadeiraVinculoResolvido => row != null);
  }
}

export const assadeiraResolver = new AssadeiraResolver();
