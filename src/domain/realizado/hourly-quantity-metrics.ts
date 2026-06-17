import { getBrazilHourFromIso } from '@/lib/utils/date-utils';

export type HourlyQuantityEntry = {
  quantity: number;
  timestamp?: string;
};

export function buildHourlyQuantityMap(entries: HourlyQuantityEntry[]): Map<number, number> {
  const map = new Map<number, number>();

  for (const entry of entries) {
    if (entry.quantity <= 0) continue;
    const hour = getBrazilHourFromIso(entry.timestamp);
    if (hour === null) continue;
    map.set(hour, (map.get(hour) ?? 0) + entry.quantity);
  }

  return map;
}

export function getQuantityForHour(map: Map<number, number>, hour: number): number {
  return map.get(hour) ?? 0;
}

export function cumulativeQuantityUntilHour(map: Map<number, number>, hour: number): number {
  let sum = 0;
  for (let h = 0; h <= hour; h++) {
    sum += map.get(h) ?? 0;
  }
  return sum;
}

export function unionHoursWithQuantity(...maps: Map<number, number>[]): number[] {
  const hours = new Set<number>();

  for (const map of maps) {
    for (const [hour, quantity] of map) {
      if (quantity > 0) hours.add(hour);
    }
  }

  return [...hours].sort((a, b) => a - b);
}

export function countQuantityWithoutValidHour(entries: HourlyQuantityEntry[]): number {
  let total = 0;

  for (const entry of entries) {
    if (entry.quantity <= 0) continue;
    if (getBrazilHourFromIso(entry.timestamp) === null) total += entry.quantity;
  }

  return total;
}

/** Faixa horária no fuso BR: hora 7 → "7h–8h"; 23 → "23h–24h". */
export function formatIntervaloHoraBr(hour: number): string {
  if (hour < 0 || hour > 23) return `${hour}h`;
  if (hour === 23) return '23h–24h';
  return `${hour}h–${hour + 1}h`;
}

/** Inteiro pt-BR; zero → "-" */
export function formatIntPtBrOrDash(value: number): string {
  if (value === 0) return '-';
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
