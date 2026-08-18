import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { ProducaoTurnoDiaResolver } from './producao-turno-dia';

const turnos = [
  { numero: 1 as const, inicio: '07:00', fim: '14:00' },
  { numero: 2 as const, inicio: '14:00', fim: '22:00' },
  { numero: 3 as const, inicio: '22:00', fim: '05:00' },
];

const resolver = new ProducaoTurnoDiaResolver();

describe('ProducaoTurnoDiaResolver', () => {
  it('às 15:00 usa o T1 de hoje', () => {
    const now = brazilClockUtcMs('2026-08-18', '15:00');
    const dia = resolver.resolve(now, turnos);
    expect(dia?.startMs).toBe(brazilClockUtcMs('2026-08-18', '07:00'));
    expect(dia?.endMs).toBe(brazilClockUtcMs('2026-08-19', '05:00'));
  });

  it('às 02:00 ainda é o dia que começou ontem às 07:00', () => {
    const now = brazilClockUtcMs('2026-08-19', '02:00');
    const dia = resolver.resolve(now, turnos);
    expect(dia?.startMs).toBe(brazilClockUtcMs('2026-08-18', '07:00'));
  });

  it('às 06:00 (vão após o último) retorna null', () => {
    const now = brazilClockUtcMs('2026-08-19', '06:00');
    expect(resolver.resolve(now, turnos)).toBeNull();
  });
});
