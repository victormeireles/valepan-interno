import type {
  FluxoFilaItem,
  FluxoFilaItemOrigem,
  FluxoFilaKey,
  FluxoFilaPerdaOrigem,
  FluxoFilaUltimoLote,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import { formatBrazilHourMinuteLabel } from '@/lib/utils/date-utils';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { fmtQty } from './fluxo-display-scale';

export function formatPresoDuracao(presoMin: number): string {
  if (presoMin < 60) return `${presoMin} min`;
  const h = Math.floor(presoMin / 60);
  const m = presoMin % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function formatPresoDuracaoCompacta(presoMin: number): string {
  if (presoMin < 60) return `${presoMin}min`;
  const h = Math.floor(presoMin / 60);
  const m = presoMin % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

export function formatAcimaDoPrazoLinha(qtyLabel: string, prazoMin: number): string {
  return `${qtyLabel} acima do prazo de ${formatPresoDuracao(prazoMin)}`;
}

export function formatAcimaDoPrazoBadge(qtyLabel: string, prazoMin: number): string {
  return `${qtyLabel} > ${formatPresoDuracaoCompacta(prazoMin)}`;
}

export function formatNenhumAcimaDoPrazo(prazoMin: number): string {
  return `Nenhum acima do prazo de ${formatPresoDuracao(prazoMin)}`;
}

export function formatNaFilaBadge(naFilaMin: number, filaKey: FluxoFilaKey): string {
  const onde = filaKey === 'resfriando' ? 'no resfriamento' : 'na câmara';
  return `há ${formatPresoDuracao(naFilaMin)} ${onde}`;
}

function formatQtyComUnidade(qty: number, unitLabel: string, compact: boolean): string {
  const unit = unitLabel.toUpperCase();
  return compact ? `${fmtQty(qty)}${unit}` : `${fmtQty(qty)} ${unit}`;
}

export function formatFilaQty(
  un: number,
  scale: FluxoDisplayScale,
  assadeiraNome: string,
  produtoNome: string,
): string {
  return formatQtyComUnidade(scale.fromUn(un, assadeiraNome, produtoNome), scale.unitLabel, false);
}

export function formatFilaQtyCompact(
  un: number,
  scale: FluxoDisplayScale,
  assadeiraNome: string,
  produtoNome: string,
): string {
  return formatQtyComUnidade(scale.fromUn(un, assadeiraNome, produtoNome), scale.unitLabel, true);
}

type FilaResumoQtyOptions = {
  presoOnly?: boolean;
  origem?: FluxoFilaItemOrigem | 'nao_do_dia';
  compact?: boolean;
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
  return formatQtyComUnidade(total, scale.unitLabel, options?.compact === true);
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

  static badgeApoio(qtyLabel: string, datasOp: string[]): string {
    if (datasOp.length === 1) {
      return `${qtyLabel} OP ${FluxoFilaEmbaladoCopy.dataOpLabel(datasOp[0])}`;
    }
    if (datasOp.length > 1) return `${qtyLabel} OP ant.`;
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

  static ariaTile(
    filaLabel: string,
    qtyDia: string,
    alerta: string | null,
    ultimoLote?: string | null,
  ): string {
    const partes = [filaLabel, qtyDia];
    if (alerta) partes.push(alerta);
    if (ultimoLote) partes.push(`último lote ${ultimoLote}`);
    return partes.join(', ');
  }

  static datasOpAnteriores(items: FluxoFilaItem[]): string[] {
    const datas = new Set<string>();
    for (const item of items) {
      if (item.origem === 'op_anterior' && item.dataOp) datas.add(item.dataOp);
    }
    return [...datas].sort((a, b) => b.localeCompare(a));
  }
}

const PERDA_LABEL: Record<FluxoFilaPerdaOrigem, { badge: string; heading: string }> = {
  fermentacao: { badge: 'não fermentado', heading: 'Não fermentado' },
  forno: { badge: 'não assado', heading: 'Não assado' },
  embalagem: { badge: 'não embalado', heading: 'Não embalado' },
};

export class FluxoFilaPerdasCopy {
  static badge(origem: FluxoFilaPerdaOrigem | null): string | null {
    if (!origem) return null;
    return PERDA_LABEL[origem].badge;
  }

  static heading(origem: FluxoFilaPerdaOrigem): string {
    return PERDA_LABEL[origem].heading;
  }
}

export class FluxoFilaUltimoLoteCopy {
  static partes(lote: FluxoFilaUltimoLote, scale: FluxoDisplayScale): {
    qty: string;
    produto: string;
    hora: string;
  } {
    return {
      qty: formatFilaQtyCompact(lote.volumeUn, scale, lote.assadeiraNome, lote.produtoNome),
      produto: lote.produtoNome,
      hora: formatBrazilHourMinuteLabel(new Date(lote.produzidoEm)),
    };
  }

  static linha(lote: FluxoFilaUltimoLote, scale: FluxoDisplayScale): string {
    const { qty, produto, hora } = FluxoFilaUltimoLoteCopy.partes(lote, scale);
    return `${qty} ${produto} ${hora}`;
  }
}
