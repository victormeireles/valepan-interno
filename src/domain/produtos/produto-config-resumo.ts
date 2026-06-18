import type { ProdutoResumoComReceitas } from '@/app/actions/produto-receitas-actions';
import type { ProdutoComAssadeirasResumo } from '@/domain/assadeiras/produto-assadeira-types';

export type ProdutoConfigResumo = ProdutoComAssadeirasResumo & {
  receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'];
  receitasVinculadasCount: number;
};

export function countReceitasVinculadas(
  vinculadas: ProdutoResumoComReceitas['receitas_vinculadas'],
): number {
  return Object.values(vinculadas).filter((item) => item?.ativo).length;
}

export function mergeProdutoConfigResumos(
  produtosAssadeiras: ProdutoComAssadeirasResumo[],
  produtosReceitas: ProdutoResumoComReceitas[],
): ProdutoConfigResumo[] {
  const receitasById = new Map(produtosReceitas.map((produto) => [produto.id, produto]));

  return produtosAssadeiras.map((produto) => {
    const receitas = receitasById.get(produto.id);
    const receitasVinculadas = receitas?.receitas_vinculadas ?? {};

    return {
      ...produto,
      receitasVinculadas,
      receitasVinculadasCount: countReceitasVinculadas(receitasVinculadas),
    };
  });
}
