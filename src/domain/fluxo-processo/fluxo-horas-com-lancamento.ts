import { extractCalendarDate } from '@/lib/utils/date-utils';

import type { FluxoEtapaKey, VpFluxoPayload } from './fluxo-processo-types';

export const FLUXO_HORAS_DIA = 24;

/**
 * Base da barra "horas com lançamento / N".
 * Dias passados: 24. Hoje (BR): hora atual do relógio (mín. 1).
 * Aceita `dia` em ISO (YYYY-MM-DD) ou BR (dd/mm/yyyy) — o payload usa BR.
 */
export class FluxoHorasBaseResolver {
  resolve(dia: string, now: Date = new Date()): number {
    const diaISO = extractCalendarDate(dia);
    const hojeISO = getTodayISOInBrazilTimezoneFrom(now);
    if (!diaISO || diaISO !== hojeISO) {
      return FLUXO_HORAS_DIA;
    }
    const horaAtual = brazilHourOf(now);
    return Math.min(FLUXO_HORAS_DIA, Math.max(1, horaAtual));
  }
}

/**
 * Horas cheias com pelo menos um lançamento na etapa,
 * limitadas à base do dia (0 .. base-1).
 */
export class FluxoHorasComLancamentoCounter {
  private readonly baseResolver = new FluxoHorasBaseResolver();

  count(
    fluxo: VpFluxoPayload,
    etapaKey: FluxoEtapaKey,
    now: Date = new Date(),
  ): { horasCom: number; baseHoras: number } {
    const baseHoras = this.baseResolver.resolve(fluxo.dia, now);
    const matriz = fluxo.matriz[etapaKey];
    let horasCom = 0;
    for (let hora = 0; hora < baseHoras; hora += 1) {
      const temLancamento = fluxo.ordemAss.some(
        (assadeira) => (matriz[assadeira]?.[hora] ?? 0) > 0,
      );
      if (temLancamento) horasCom += 1;
    }
    return { horasCom, baseHoras };
  }
}

function getTodayISOInBrazilTimezoneFrom(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function brazilHourOf(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  return parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
}
