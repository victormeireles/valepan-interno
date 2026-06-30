export function formatarValorLateral(
  valor: number,
  unidade: string | null | undefined,
): string | null {
  if (!unidade || valor <= 0) return null;

  const unidadeLower = unidade.toLowerCase().trim();
  const isKg =
    unidadeLower === 'kg' ||
    unidadeLower === 'kilograma' ||
    unidadeLower === 'kilogramas';

  if (isKg && valor < 1) {
    return `${Math.round(valor * 1000)}g`;
  }

  const unidadeFormatada = unidade.replace(/\s+/g, '');
  return `${valor}${unidadeFormatada}`;
}

export function calcularGramas(
  valor: number,
  unidade: string | null | undefined,
): number | null {
  if (!unidade) return null;
  const unidadeLower = unidade.toLowerCase().trim();
  if (
    (unidadeLower === 'kg' ||
      unidadeLower === 'kilograma' ||
      unidadeLower === 'kilogramas') &&
    valor > 0 &&
    valor < 1
  ) {
    return Math.round(valor * 1000);
  }
  return null;
}
