import type { FluxoDisplayScale } from './fluxo-display-scale';
import { fmtQty } from './fluxo-display-scale';

export function formatPresoDuracao(presoMin: number): string {
  if (presoMin < 60) return `${presoMin} min`;
  const h = Math.floor(presoMin / 60);
  const m = presoMin % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function formatFilaQty(
  un: number,
  scale: FluxoDisplayScale,
  assadeiraNome: string,
  produtoNome: string,
): string {
  const qty = scale.fromUn(un, assadeiraNome, produtoNome);
  return `${fmtQty(qty)} ${scale.unitLabel.toUpperCase()}`;
}
