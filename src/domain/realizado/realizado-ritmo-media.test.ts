import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { RealizadoRitmoMediaBuilder } from './realizado-ritmo-media';

const HOJE = '2026-08-17';
const ONTEM = '2026-08-16';
const SEMANA = '2026-08-10';
const builder = new RealizadoRitmoMediaBuilder();

function isoAt(dateISO: string, clock: string): string {
  return new Date(brazilClockUtcMs(dateISO, clock)).toISOString();
}

describe('RealizadoRitmoMediaBuilder', () => {
  it('usa a calculadora compartilhada e a janela do primeiro lote', () => {
    const view = builder.build({
      hoje: [
        { quantity: 80, timestamp: isoAt(HOJE, '06:30') },
        { quantity: 80, timestamp: isoAt(HOJE, '08:30') },
      ],
      ontem: [
        { quantity: 50, timestamp: isoAt(ONTEM, '07:00') },
        { quantity: 50, timestamp: isoAt(ONTEM, '08:00') },
      ],
      semana: [
        { quantity: 80, timestamp: isoAt(SEMANA, '09:00') },
        { quantity: 80, timestamp: isoAt(SEMANA, '09:30') },
      ],
      dateOntem: ONTEM,
      endCapMs: brazilClockUtcMs(HOJE, '08:30'),
    });

    expect(view).not.toBeNull();
    expect(view?.ritmo).toBe(80);
    expect(view?.ritmoOntem).toBe(100);
    expect(view?.ritmoSemana).toBe(320);
    expect(view?.horaInicioLabel).toBe('6h30');
    expect(view?.horaFimLabel).toBe('8h30');
  });

  it('retorna null sem lançamentos no dia', () => {
    expect(
      builder.build({
        hoje: [],
        ontem: [],
        semana: [],
        dateOntem: null,
        endCapMs: brazilClockUtcMs(HOJE, '10:00'),
      }),
    ).toBeNull();
  });
});
