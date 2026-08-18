import type { FluxoFilaItem } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
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

export function formatFilaResumoQty(
  items: FluxoFilaItem[],
  scale: FluxoDisplayScale,
  options?: { presoOnly?: boolean },
): string {
  const selected = options?.presoOnly ? items.filter((i) => i.preso) : items;
  let total = 0;
  for (const item of selected) {
    total += scale.fromUn(item.volumeUn, item.assadeiraNome, item.produtoNome);
  }
  return `${fmtQty(total)} ${scale.unitLabel.toUpperCase()}`;
}
