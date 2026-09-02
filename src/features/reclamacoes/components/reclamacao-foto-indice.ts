export function indiceFotoCircular(
  atual: number,
  total: number,
  direcao: -1 | 1,
): number {
  if (total <= 0) return 0;
  return (atual + direcao + total) % total;
}
