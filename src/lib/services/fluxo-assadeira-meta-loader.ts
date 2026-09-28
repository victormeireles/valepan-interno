import type { AssadeiraVinculoOrigem } from '@/domain/assadeiras/assadeira-resolver-types';
import {
  buildVinculoResolvido,
  mapAssadeiraJoin,
} from '@/domain/assadeiras/assadeira-vinculo-builder';
import { resolvePesoGramas } from '@/domain/assadeiras/produto-peso';
import type { AssadeiraMetaContext } from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import type { ProductDTO } from '@/lib/services/products/supabase-product-service';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type AssadeiraJoin = {
  nome: string | null;
  unidades_por_assadeira: number | null;
  ativo: boolean;
};

type VinculoRow = {
  produto_id?: string;
  categoria_id?: string;
  peso_g?: number;
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  ordem: number;
  created_at: string;
  assadeiras: AssadeiraJoin | AssadeiraJoin[] | null;
};

const SELECT_EXCECAO =
  'produto_id, assadeira_id, unidades_por_assadeira, ordem, created_at, assadeiras(nome, unidades_por_assadeira, ativo)';
const SELECT_REGRA =
  'categoria_id, peso_g, assadeira_id, unidades_por_assadeira, ordem, created_at, assadeiras(nome, unidades_por_assadeira, ativo)';

/**
 * Assadeira padrão de vários produtos em duas consultas, em vez de uma por produto.
 */
export class FluxoAssadeiraMetaLoader {
  async load(produtos: ProductDTO[]): Promise<Map<string, AssadeiraMetaContext>> {
    const unique = [...new Map(produtos.map((produto) => [produto.id, produto])).values()];
    if (unique.length === 0) return new Map();

    const excecoes = await this.loadExcecoes(unique.map((produto) => produto.id));
    const map = new Map<string, AssadeiraMetaContext>();
    const semExcecao: ProductDTO[] = [];

    for (const produto of unique) {
      const ctx = firstContext(excecoes.get(produto.id) ?? [], produto.boxUnits);
      if (ctx) map.set(produto.id, ctx);
      else semExcecao.push(produto);
    }

    const regras = await this.loadRegras(semExcecao);
    for (const produto of semExcecao) {
      const ctx = firstContext(regras.get(produto.id) ?? [], produto.boxUnits, 'regra');
      if (ctx) map.set(produto.id, ctx);
    }
    return map;
  }

  private async loadExcecoes(produtoIds: string[]): Promise<Map<string, VinculoRow[]>> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('produto_assadeiras')
      .select(SELECT_EXCECAO)
      .in('produto_id', produtoIds)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Erro ao ler assadeiras do produto: ${error.message}`);
    return groupBy(data as VinculoRow[], (row) => row.produto_id ?? '');
  }

  private async loadRegras(produtos: ProductDTO[]): Promise<Map<string, VinculoRow[]>> {
    const categorias = [
      ...new Set(produtos.map((produto) => produto.categoriaId).filter((id): id is string => Boolean(id))),
    ];
    if (categorias.length === 0) return new Map();

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('categoria_assadeira_regras')
      .select(SELECT_REGRA)
      .in('categoria_id', categorias)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Erro ao ler regras de assadeira: ${error.message}`);

    const byKey = groupBy(data as VinculoRow[], (row) => `${row.categoria_id}:${row.peso_g}`);
    const map = new Map<string, VinculoRow[]>();
    for (const produto of produtos) {
      const peso = resolvePesoGramas({ unit_weight: produto.unitWeight, nome: produto.nome });
      if (!produto.categoriaId || peso == null) continue;
      map.set(produto.id, byKey.get(`${produto.categoriaId}:${peso}`) ?? []);
    }
    return map;
  }
}

function firstContext(
  rows: VinculoRow[],
  boxUnits: number | null,
  origem: AssadeiraVinculoOrigem = 'excecao',
): AssadeiraMetaContext | null {
  for (const row of rows) {
    const vinculo = buildVinculoResolvido(
      row.assadeira_id,
      mapAssadeiraJoin(row.assadeiras),
      row.unidades_por_assadeira,
      origem,
    );
    if (!vinculo) continue;
    return { unidadesPorAssadeira: vinculo.unidades_efetivas, boxUnits };
  }
  return null;
}

function groupBy(rows: VinculoRow[], keyOf: (row: VinculoRow) => string): Map<string, VinculoRow[]> {
  const map = new Map<string, VinculoRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

export const fluxoAssadeiraMetaLoader = new FluxoAssadeiraMetaLoader();
