export function normalizarDescricaoProdutoOmie(
  descricao: string | null | undefined,
): string {
  return (descricao ?? '').trim().toUpperCase();
}
