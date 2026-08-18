import { filterPedidosEmbalagemPorCategoriaVisivel } from './filter-pedidos-embalagem-por-categoria';

/**
 * Recorte das telas de realizado/fluxo: só categorias visíveis na embalagem
 * (Hambúrguer / Hot Dog e as marcadas em config).
 */
export class RecorteVisivelEmbalagem {
  constructor(
    private readonly categoriaPorProduto: Map<string, string | null>,
    private readonly categoriasVisiveis: Set<string>,
  ) {}

  produtoVisivel(produtoId: string): boolean {
    const categoriaId = this.categoriaPorProduto.get(produtoId);
    return categoriaId != null && this.categoriasVisiveis.has(categoriaId);
  }

  ordemIdsVisiveis(ordens: Array<{ id: string; produtoId: string }>): Set<string> {
    return new Set(
      filterPedidosEmbalagemPorCategoriaVisivel(
        ordens,
        this.categoriaPorProduto,
        this.categoriasVisiveis,
      ).map((ordem) => ordem.id),
    );
  }

  lotesPorOrdem<T extends { ordemProducaoId: string }>(
    lotes: T[],
    visivelOrdemIds: Set<string>,
  ): T[] {
    return lotes.filter((lote) => visivelOrdemIds.has(lote.ordemProducaoId));
  }

  lotesPorProduto<T extends { produtoId: string }>(lotes: T[]): T[] {
    return lotes.filter((lote) => this.produtoVisivel(lote.produtoId));
  }

  eventosPorNome<T extends { produtoNome: string }>(
    eventos: T[],
    nomesVisiveis: Set<string>,
  ): T[] {
    return eventos.filter((evento) => nomesVisiveis.has(evento.produtoNome));
  }
}

export function produtoNomesVisiveisDe(
  produtos: ReadonlyArray<{ nome: string; categoriaId: string | null }>,
  categoriasVisiveis: Set<string>,
): Set<string> {
  return new Set(
    produtos
      .filter((p) => p.categoriaId != null && categoriasVisiveis.has(p.categoriaId))
      .map((p) => p.nome),
  );
}
