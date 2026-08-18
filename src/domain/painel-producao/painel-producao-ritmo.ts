import { formatBrazilHourMinuteLabel } from '@/lib/utils/date-utils';
import type { PainelProducaoRitmoEntry } from './painel-producao-types';

const MS_PER_HOUR = 3_600_000;

export type RitmoJanelaMs = {
  firstMs: number;
  lastMs: number;
  endMs: number;
};

type RitmoParsed = {
  times: number[];
  total: number;
};

class PainelProducaoRitmoParser {
  parse(entries: PainelProducaoRitmoEntry[], endCapMs: number | null): RitmoParsed {
    const times: number[] = [];
    let total = 0;

    for (const entry of entries) {
      if (entry.quantity <= 0) continue;
      const time = this.parseTime(entry.timestamp);
      if (time == null) continue;
      if (endCapMs != null && time > endCapMs) continue;
      times.push(time);
      total += entry.quantity;
    }

    times.sort((a, b) => a - b);
    return { times, total };
  }

  private parseTime(raw: string | undefined): number | null {
    const value = raw?.trim();
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }
}

class PainelProducaoRitmoJanela {
  durationMs(times: number[], endCapMs: number | null): number {
    const bounds = this.janela(times, endCapMs);
    if (!bounds) return 0;
    return Math.max(0, bounds.endMs - bounds.firstMs);
  }

  janela(times: number[], endCapMs: number | null): RitmoJanelaMs | null {
    if (times.length === 0) return null;
    const firstMs = times[0];
    const lastMs = times[times.length - 1];
    const endMs = endCapMs == null ? lastMs : Math.max(lastMs, endCapMs);
    if (endMs <= firstMs) return null;
    return { firstMs, lastMs, endMs };
  }
}

const parser = new PainelProducaoRitmoParser();
const janela = new PainelProducaoRitmoJanela();

export function calcularRitmoMedio(
  entries: PainelProducaoRitmoEntry[],
  endCapMs: number | null,
): number {
  const parsed = parser.parse(entries, endCapMs);
  const durationMs = janela.durationMs(parsed.times, endCapMs);
  if (parsed.total <= 0 || durationMs <= 0) return 0;
  return parsed.total / (durationMs / MS_PER_HOUR);
}

export function resolveRitmoJanelaMs(
  entries: PainelProducaoRitmoEntry[],
  endCapMs: number | null,
): RitmoJanelaMs | null {
  const parsed = parser.parse(entries, endCapMs);
  return janela.janela(parsed.times, endCapMs);
}

export function formatRitmoJanelaLabels(
  entries: PainelProducaoRitmoEntry[],
  endCapMs: number | null,
): { ini: string; fim: string } | null {
  const bounds = resolveRitmoJanelaMs(entries, endCapMs);
  if (!bounds) return null;
  return {
    ini: formatBrazilHourMinuteLabel(new Date(bounds.firstMs)),
    fim: formatBrazilHourMinuteLabel(new Date(bounds.endMs)),
  };
}

export function buildRitmoComparisons(
  entries: PainelProducaoRitmoEntry[],
  entriesOntem: PainelProducaoRitmoEntry[],
  entriesSemana: PainelProducaoRitmoEntry[],
  dateOntem: string | null,
  referenceEndMs: number | null,
): { ritmo: number; ritmoOntem: number; ritmoSemana: number } {
  const ritmo = calcularRitmoMedio(entries, referenceEndMs);
  const ritmoOntem = dateOntem ? calcularRitmoMedio(entriesOntem, null) : 0;
  const ritmoSemana = calcularRitmoMedio(entriesSemana, null);

  return {
    ritmo: Math.round(ritmo),
    ritmoOntem: Math.round(ritmoOntem),
    ritmoSemana: Math.round(ritmoSemana),
  };
}
