import type { Quantidade } from '@/domain/types/inventario';
import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import { calcularSaldoAntes } from '@/domain/estoque/quantidade-calculo';

export type ManualAdjustmentDisplay = {
  id: string;
  createdAt: string;
  tipoEstoqueNome: string;
  produtoNome: string;
  antes: Quantidade;
  depois: Quantidade;
  delta: Quantidade;
};

export type CxPctDeltaChip = {
  unit: 'cx' | 'pct';
  value: number;
  signedLabel: string;
  tone: 'positive' | 'negative';
};

export function buildManualAdjustmentDisplay(
  mov: EstoqueMovimentoRecord,
): ManualAdjustmentDisplay {
  return {
    id: mov.id,
    createdAt: mov.createdAt,
    tipoEstoqueNome: mov.tipoEstoqueNome,
    produtoNome: mov.produtoNome,
    antes: calcularSaldoAntes(mov.saldo, mov.delta),
    depois: mov.saldo,
    delta: mov.delta,
  };
}

/** Zero inherits the overall cx+pct direction so labels stay "+0" / "-0". */
export function buildCxPctDeltaChips(delta: Quantidade): CxPctDeltaChip[] {
  const caixas = delta.caixas || 0;
  const pacotes = delta.pacotes || 0;
  const overallPositive = caixas + pacotes >= 0;

  return [
    toCxPctChip('cx', caixas, overallPositive),
    toCxPctChip('pct', pacotes, overallPositive),
  ];
}

function toCxPctChip(
  unit: 'cx' | 'pct',
  value: number,
  overallPositive: boolean,
): CxPctDeltaChip {
  if (value > 0) {
    return { unit, value, signedLabel: `+${value}`, tone: 'positive' };
  }
  if (value < 0) {
    return { unit, value, signedLabel: String(value), tone: 'negative' };
  }
  return {
    unit,
    value: 0,
    signedLabel: overallPositive ? '+0' : '-0',
    tone: overallPositive ? 'positive' : 'negative',
  };
}

export function formatAdjustmentTime(iso: string, showDate: boolean): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!showDate) return time;
  const day = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day} · ${time}`;
}
