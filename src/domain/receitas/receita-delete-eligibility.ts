export function countProdutosVinculadosReceita(
  produtoReceitas: Array<{ id: string }> | null | undefined,
): number {
  return produtoReceitas?.length ?? 0;
}

export function podeRemoverReceita(produtosVinculadosCount: number): boolean {
  return produtosVinculadosCount === 0;
}

export function motivoBloqueioRemocaoReceita(produtosVinculadosCount: number): string {
  if (produtosVinculadosCount <= 0) return '';
  if (produtosVinculadosCount === 1) {
    return 'Receita vinculada a 1 produto. Remova o vínculo antes de excluir.';
  }
  return `Receita vinculada a ${produtosVinculadosCount} produtos. Remova os vínculos antes de excluir.`;
}
