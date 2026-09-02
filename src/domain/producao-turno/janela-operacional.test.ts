import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { JanelaOperacionalResolver } from './janela-operacional';

const resolver = new JanelaOperacionalResolver();

describe('JanelaOperacionalResolver.forDate', () => {
  it('T1 22:00 na data 02/09 → [01/09 22:00, 02/09 22:00)', () => {
    const j = resolver.forDate('2026-09-02', '22:00');
    expect(j.startDateISO).toBe('2026-09-01');
    expect(j.iniMs).toBe(brazilClockUtcMs('2026-09-01', '22:00'));
    expect(j.fimMs).toBe(brazilClockUtcMs('2026-09-02', '22:00'));
    expect(j.t1Inicio).toBe('22:00');
  });

  it('T1 07:00 na data 02/09 → [02/09 07:00, 03/09 07:00)', () => {
    const j = resolver.forDate('2026-09-02', '07:00');
    expect(j.startDateISO).toBe('2026-09-02');
    expect(j.iniMs).toBe(brazilClockUtcMs('2026-09-02', '07:00'));
    expect(j.fimMs).toBe(brazilClockUtcMs('2026-09-03', '07:00'));
  });

  it('T1 00:00 na data 02/09 → dia civil', () => {
    const j = resolver.forDate('2026-09-02', '00:00');
    expect(j.iniMs).toBe(brazilClockUtcMs('2026-09-02', '00:00'));
    expect(j.fimMs).toBe(brazilClockUtcMs('2026-09-03', '00:00'));
  });
});

describe('JanelaOperacionalResolver.contains', () => {
  it('fronteira fim é exclusiva', () => {
    const j = resolver.forDate('2026-09-02', '22:00');
    expect(resolver.contains(j.fimMs, j)).toBe(false);
    expect(resolver.contains(j.fimMs - 1, j)).toBe(true);
    expect(resolver.contains(j.iniMs, j)).toBe(true);
  });
});

describe('JanelaOperacionalResolver.hoursAxis', () => {
  it('T1 22h → 22…21', () => {
    expect(resolver.hoursAxis('22:00')).toEqual([
      22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
  });
});

describe('JanelaOperacionalResolver.civilHourDateISO', () => {
  it('hora 22 da janela 22h pertence a 01/09; hora 10 a 02/09', () => {
    const j = resolver.forDate('2026-09-02', '22:00');
    expect(resolver.civilHourDateISO(j, 22)).toBe('2026-09-01');
    expect(resolver.civilHourDateISO(j, 10)).toBe('2026-09-02');
  });
});
