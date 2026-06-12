import {
  buildVinculoResolvido,
  mapAssadeiraJoin,
} from '@/domain/assadeiras/assadeira-vinculo-builder';
import type { AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';
import { resolvePesoGramas } from '@/domain/assadeiras/produto-peso';

export type RegraAssadeiraRow = {
  categoria_id: string;
  peso_g: number;
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  assadeiras: {
    nome: string | null;
    unidades_por_assadeira: number | null;
    ativo: boolean;
  } | {
    nome: string | null;
    unidades_por_assadeira: number | null;
    ativo: boolean;
  }[] | null;
};

export type ProdutoRegraInput = {
  categoria_id: string;
  unit_weight: number | null;
  nome: string;
};

export function buildRegraAssadeiraIndex(
  regras: RegraAssadeiraRow[],
): Map<string, RegraAssadeiraRow[]> {
  const index = new Map<string, RegraAssadeiraRow[]>();
  for (const regra of regras) {
    const key = `${regra.categoria_id}:${regra.peso_g}`;
    const list = index.get(key) ?? [];
    list.push(regra);
    index.set(key, list);
  }
  return index;
}

export function resolveRegraVinculosForProduto(
  produto: ProdutoRegraInput,
  regraIndex: Map<string, RegraAssadeiraRow[]>,
): AssadeiraVinculoResolvido[] {
  const pesoG = resolvePesoGramas({
    unit_weight: produto.unit_weight,
    nome: produto.nome,
  });
  if (pesoG == null) return [];

  const regras = regraIndex.get(`${produto.categoria_id}:${pesoG}`) ?? [];
  return regras
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

export function countRegraVinculosForProduto(
  produto: ProdutoRegraInput,
  regraIndex: Map<string, RegraAssadeiraRow[]>,
): number {
  return resolveRegraVinculosForProduto(produto, regraIndex).length;
}
