export const CATEGORIA_EM_USO_MESSAGE =
  'Categoria em uso. Inative em vez de excluir.';

export function assertCategoriaPodeExcluir(
  reclamacoesCount: number,
): string | null {
  if (reclamacoesCount > 0) return CATEGORIA_EM_USO_MESSAGE;
  return null;
}
