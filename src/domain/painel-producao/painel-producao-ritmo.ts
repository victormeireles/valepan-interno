import type { PainelProducaoRitmoEntry } from './painel-producao-types';
import { brazilSevenAmUtcMs } from '@/lib/utils/date-utils';

function sumQuantitiesInWindow(
  entries: PainelProducaoRitmoEntry[],
  startMs: number,
  endMs: number,
): number {
  let sum = 0;

  for (const entry of entries) {
    if (entry.quantity <= 0) continue;
    const raw = entry.timestamp?.trim();
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isNaN(time)) continue;
    if (time >= startMs && time <= endMs) sum += entry.quantity;
  }

  return sum;
}

function lastTimestampMs(entries: PainelProducaoRitmoEntry[], dateISO: string): number | null {
  let max = -Infinity;

  for (const entry of entries) {
    if (entry.quantity <= 0) continue;
    const raw = entry.timestamp?.trim();
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isNaN(time)) continue;
    if (time > max) max = time;
  }

  if (!Number.isFinite(max)) return null;

  const startMs = brazilSevenAmUtcMs(dateISO);
  if (!Number.isFinite(startMs) || max < startMs) return null;
  return max;
}

export function calcularRitmoMedio(
  entries: PainelProducaoRitmoEntry[],
  dateISO: string,
  windowEndMs: number,
): number {
  const startMs = brazilSevenAmUtcMs(dateISO);
  if (!Number.isFinite(startMs) || windowEndMs <= startMs) return 0;

  const windowMs = windowEndMs - startMs;
  const total = sumQuantitiesInWindow(entries, startMs, windowEndMs);
  return total / (windowMs / 3_600_000);
}

export function resolveRitmoWindowEndMs(
  entries: PainelProducaoRitmoEntry[],
  dateISO: string,
  referenceEndMs: number,
): number {
  const startMs = brazilSevenAmUtcMs(dateISO);
  const lastMs = lastTimestampMs(entries, dateISO);
  if (lastMs === null) return Math.max(startMs, referenceEndMs);
  return Math.min(lastMs, referenceEndMs);
}

export function buildRitmoComparisons(
  entries: PainelProducaoRitmoEntry[],
  entriesOntem: PainelProducaoRitmoEntry[],
  entriesSemana: PainelProducaoRitmoEntry[],
  dateISO: string,
  dateOntem: string | null,
  dateSemana: string,
  referenceEndMs: number,
): { ritmo: number; ritmoOntem: number; ritmoSemana: number } {
  const endMs = resolveRitmoWindowEndMs(entries, dateISO, referenceEndMs);
  const windowMs = endMs - brazilSevenAmUtcMs(dateISO);

  const ritmo = calcularRitmoMedio(entries, dateISO, endMs);

  let ritmoOntem = 0;
  if (dateOntem && windowMs > 0) {
    const startOntem = brazilSevenAmUtcMs(dateOntem);
    ritmoOntem = calcularRitmoMedio(entriesOntem, dateOntem, startOntem + windowMs);
  }

  const startSemana = brazilSevenAmUtcMs(dateSemana);
  const ritmoSemana =
    windowMs > 0
      ? calcularRitmoMedio(entriesSemana, dateSemana, startSemana + windowMs)
      : 0;

  return { ritmo: Math.round(ritmo), ritmoOntem: Math.round(ritmoOntem), ritmoSemana: Math.round(ritmoSemana) };
}
