import { getBrazilCalendarDateTimeFromInstant } from '@/lib/utils/date-utils';

import { FLUXO_GAP_MIN_MINUTES } from './fluxo-processo-constants';
import type { FluxoGap } from './fluxo-processo-types';

export type FluxoParadasResult = {
  ini: number;
  fim: number;
  span: number;
  gaps: FluxoGap[];
  gapTot: number;
  ativo: number;
};

/** Minuto do dia civil BR (0–1439) a partir de ISO. */
export function brazilMinuteOfDayFromIso(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const { hour, minute } = getBrazilCalendarDateTimeFromInstant(d);
  return hour * 60 + minute;
}

/**
 * Parada = intervalo ≥ gapMin entre apontamentos consecutivos da mesma etapa.
 * span = último − primeiro; ativo = span − Σ paradas.
 */
export class FluxoParadasCalculator {
  constructor(private readonly gapMinMinutes: number = FLUXO_GAP_MIN_MINUTES) {}

  compute(timestampsIso: string[]): FluxoParadasResult | null {
    const minutes = timestampsIso
      .map(brazilMinuteOfDayFromIso)
      .filter((m): m is number => m != null)
      .sort((a, b) => a - b);

    if (minutes.length === 0) return null;

    const ini = minutes[0];
    const fim = minutes[minutes.length - 1];
    const span = fim - ini;
    const gaps: FluxoGap[] = [];

    for (let i = 1; i < minutes.length; i++) {
      const dur = minutes[i] - minutes[i - 1];
      if (dur >= this.gapMinMinutes) {
        gaps.push({ ini: minutes[i - 1], fim: minutes[i], dur });
      }
    }

    const gapTot = gaps.reduce((t, g) => t + g.dur, 0);
    const ativo = Math.max(0, span - gapTot);

    return { ini, fim, span, gaps, gapTot, ativo };
  }
}
