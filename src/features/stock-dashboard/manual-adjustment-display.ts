import type { Quantidade } from '@/domain/types/inventario';
import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import { calcularSaldoAntes } from '@/domain/estoque/quantidade-calculo';

export type ManualAdjustmentDisplay = {
  id: string;
  createdAt: string;
  tipoEstoqueId: string;
  tipoEstoqueNome: string;
  produtoNome: string;
  antes: Quantidade;
  depois: Quantidade;
  delta: Quantidade;
};

/** Warm, distinct pill tones — stable per tipo via hash. */
const TIPO_ESTOQUE_BADGE_PALETTE = [
  'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80',
  'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80',
  'bg-rose-100 text-rose-900 ring-1 ring-rose-200/80',
  'bg-violet-100 text-violet-900 ring-1 ring-violet-200/80',
  'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80',
  'bg-teal-100 text-teal-900 ring-1 ring-teal-200/80',
  'bg-fuchsia-100 text-fuchsia-900 ring-1 ring-fuchsia-200/80',
  'bg-sky-100 text-sky-900 ring-1 ring-sky-200/80',
  'bg-lime-100 text-lime-900 ring-1 ring-lime-200/80',
  'bg-stone-200 text-stone-900 ring-1 ring-stone-300/80',
] as const;

function hashTipoKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable badge classes for a tipo de estoque (prefer id; fallback to name). */
export function tipoEstoqueBadgeClass(tipoEstoqueIdOrNome: string): string {
  const key = tipoEstoqueIdOrNome.trim().toLowerCase();
  if (!key) {
    return TIPO_ESTOQUE_BADGE_PALETTE[TIPO_ESTOQUE_BADGE_PALETTE.length - 1];
  }
  return TIPO_ESTOQUE_BADGE_PALETTE[
    hashTipoKey(key) % TIPO_ESTOQUE_BADGE_PALETTE.length
  ];
}

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
    tipoEstoqueId: mov.tipoEstoqueId,
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
