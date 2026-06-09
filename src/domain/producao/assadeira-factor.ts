export type AssadeiraFactorInput = {
  produto: number | null | undefined;
  assadeira: number | null | undefined;
};

export function resolveUnidadesPorAssadeiraEfetiva(
  input: AssadeiraFactorInput,
): number | null {
  const fator = input.produto ?? input.assadeira ?? null;
  if (fator == null || fator <= 0) return null;
  return fator;
}
