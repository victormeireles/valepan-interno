export function sortPorOrdemPlanejamento<T extends { ordemPlanejamento: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => a.ordemPlanejamento - b.ordemPlanejamento);
}

export function menorOrdemPlanejamento<T extends { ordemPlanejamento: number }>(
  items: T[],
): number {
  if (items.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...items.map((item) => item.ordemPlanejamento));
}
