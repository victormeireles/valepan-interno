export function filterPedidosEmbalagemPorCategoriaVisivel<T extends { produtoId: string }>(
  pedidos: T[],
  categoriaPorProduto: Map<string, string | null>,
  categoriasVisiveis: Set<string>,
): T[] {
  return pedidos.filter((pedido) => {
    const categoriaId = categoriaPorProduto.get(pedido.produtoId);
    if (!categoriaId) return false;
    return categoriasVisiveis.has(categoriaId);
  });
}

export function buildCategoriaPorProdutoMap(
  produtos: ReadonlyArray<{ id: string; categoriaId: string | null }>,
): Map<string, string | null> {
  return new Map(produtos.map((produto) => [produto.id, produto.categoriaId]));
}
