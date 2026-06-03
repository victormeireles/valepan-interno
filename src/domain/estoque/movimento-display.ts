import type { EstoqueMovimentoOrigem } from '@/domain/types/estoque-db';
import type { Quantidade } from '@/domain/types/inventario';

export const ORIGEM_LABELS: Record<EstoqueMovimentoOrigem, string> = {
  embalagem: 'Embalagem',
  saida: 'Saída',
  inventario: 'Inventário',
  ajuste_manual: 'Ajuste manual',
};

export const ORIGEM_COLORS: Record<EstoqueMovimentoOrigem, string> = {
  embalagem: 'bg-emerald-100 text-emerald-800',
  saida: 'bg-orange-100 text-orange-800',
  inventario: 'bg-blue-100 text-blue-800',
  ajuste_manual: 'bg-gray-100 text-gray-800',
};

export const ORIGEM_BORDER_COLORS: Record<EstoqueMovimentoOrigem, string> = {
  embalagem: 'border-l-emerald-500',
  saida: 'border-l-orange-500',
  inventario: 'border-l-blue-500',
  ajuste_manual: 'border-l-gray-400',
};

export const ORIGEM_DELTA_TEXT_COLORS: Record<EstoqueMovimentoOrigem, string> = {
  embalagem: 'text-emerald-700',
  saida: 'text-orange-700',
  inventario: 'text-blue-700',
  ajuste_manual: 'text-gray-700',
};

const FIELD_LABELS: Record<keyof Quantidade, string> = {
  caixas: 'cx',
  pacotes: 'pct',
  unidades: 'un',
  kg: 'kg',
};

export type DeltaLine = {
  field: string;
  value: number;
  signed: string;
};

export function formatDeltaLines(delta: Quantidade): DeltaLine[] {
  const lines: DeltaLine[] = [];
  (Object.keys(FIELD_LABELS) as Array<keyof Quantidade>).forEach((key) => {
    const value = delta[key];
    if (value === 0) return;
    const signed = value > 0 ? `+${value}` : String(value);
    lines.push({ field: FIELD_LABELS[key], value, signed });
  });
  return lines;
}

export function isDeltaEntrada(delta: Quantidade): boolean {
  return delta.caixas + delta.pacotes + delta.unidades + delta.kg > 0;
}
