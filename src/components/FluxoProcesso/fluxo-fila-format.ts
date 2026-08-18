import type {
  FluxoFilaItem,
  FluxoFilaItemOrigem,
  FluxoFilaKey,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { fmtQty } from './fluxo-display-scale';

export function formatPresoDuracao(presoMin: number): string {
  if (presoMin < 60) return `${presoMin} min`;
  const h = Math.floor(presoMin / 60);
  const m = presoMin % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function formatAcimaDoPrazoLinha(qtyLabel: string, prazoMin: number): string {
  return `${qtyLabel} acima do prazo de ${formatPresoDuracao(prazoMin)}`;
}

export function formatNenhumAcimaDoPrazo(prazoMin: number): string {
  return `Nenhum acima do prazo de ${formatPresoDuracao(prazoMin)}`;
}

export function formatNaFilaBadge(naFilaMin: number, filaKey: FluxoFilaKey): string {
  const onde = filaKey === 'resfriando' ? 'no resfriamento' : 'na câmara';
  return `há ${formatPresoDuracao(naFilaMin)} ${onde}`;
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

type FilaResumoQtyOptions = {
  presoOnly?: boolean;
  origem?: FluxoFilaItemOrigem | 'nao_do_dia';
};

function filtrarOrigem(
  items: FluxoFilaItem[],
  origem: FilaResumoQtyOptions['origem'],
): FluxoFilaItem[] {
  if (!origem) return items;
  if (origem === 'nao_do_dia') return items.filter((i) => i.origem !== 'op_do_dia');
  return items.filter((i) => i.origem === origem);
}

export function formatFilaResumoQty(
  items: FluxoFilaItem[],
  scale: FluxoDisplayScale,
  options?: FilaResumoQtyOptions,
): string {
  const preso = options?.presoOnly ? items.filter((i) => i.preso) : items;
  const selected = filtrarOrigem(preso, options?.origem);
  let total = 0;
  for (const item of selected) {
    total += scale.fromUn(item.volumeUn, item.assadeiraNome, item.produtoNome);
  }
  return `${fmtQty(total)} ${scale.unitLabel.toUpperCase()}`;
}

export class FluxoFilaEmbaladoCopy {
  static dataOpLabel(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length < 3) return isoDate;
    return `${parts[2]}/${parts[1]}`;
  }

  static linhaApoio(qtyLabel: string, datasOp: string[]): string {
    if (datasOp.length === 1) {
      return `${qtyLabel} de OP de ${FluxoFilaEmbaladoCopy.dataOpLabel(datasOp[0])}`;
    }
    if (datasOp.length > 1) return `${qtyLabel} de OP anterior`;
    return `${qtyLabel} sem OP`;
  }

  static headingZona(dataOp: string | null): string {
    if (!dataOp) return 'Produzido hoje · Sem OP';
    return `Produzido hoje · OP de ${FluxoFilaEmbaladoCopy.dataOpLabel(dataOp)}`;
  }

  static badge(dataOp: string | null): string {
    if (!dataOp) return 'Sem OP';
    return `OP ${FluxoFilaEmbaladoCopy.dataOpLabel(dataOp)}`;
  }

  static ariaTile(filaLabel: string, qtyDia: string, linhaApoio: string | null): string {
    if (!linhaApoio) return `${filaLabel}, ${qtyDia}`;
    return `${filaLabel}, ${qtyDia}, ${linhaApoio}`;
  }

  static datasOpAnteriores(items: FluxoFilaItem[]): string[] {
    const datas = new Set<string>();
    for (const item of items) {
      if (item.origem === 'op_anterior' && item.dataOp) datas.add(item.dataOp);
    }
    return [...datas].sort((a, b) => b.localeCompare(a));
  }
}
