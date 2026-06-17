import { describe, expect, it } from 'vitest';

import {
  buildHourlyQuantityMap,
  countQuantityWithoutValidHour,
  cumulativeQuantityUntilHour,
  formatIntervaloHoraBr,
  formatIntPtBrOrDash,
  unionHoursWithQuantity,
} from './hourly-quantity-metrics';

describe('buildHourlyQuantityMap', () => {
  it('soma quantidade por hora BR de produzidoEm', () => {
    const map = buildHourlyQuantityMap([
      { quantity: 5, timestamp: '2026-06-18T14:30:00Z' },
      { quantity: 2, timestamp: '2026-06-18T14:45:00Z' },
    ]);

    expect(map.get(11)).toBe(7);
  });
});

describe('cumulativeQuantityUntilHour', () => {
  it('acumula até a faixa informada', () => {
    const map = buildHourlyQuantityMap([
      { quantity: 3, timestamp: '2026-06-18T10:00:00Z' },
      { quantity: 4, timestamp: '2026-06-18T14:30:00Z' },
    ]);

    expect(cumulativeQuantityUntilHour(map, 11)).toBe(7);
  });
});

describe('unionHoursWithQuantity', () => {
  it('une horas com quantidade > 0', () => {
    const day = buildHourlyQuantityMap([{ quantity: 1, timestamp: '2026-06-18T14:30:00Z' }]);
    const prev = buildHourlyQuantityMap([{ quantity: 2, timestamp: '2026-06-17T15:00:00Z' }]);

    expect(unionHoursWithQuantity(day, prev)).toEqual([11, 12]);
  });
});

describe('countQuantityWithoutValidHour', () => {
  it('conta entradas sem timestamp válido', () => {
    expect(
      countQuantityWithoutValidHour([
        { quantity: 4, timestamp: undefined },
        { quantity: 2, timestamp: '2026-06-18T14:30:00Z' },
      ]),
    ).toBe(4);
  });
});

describe('formatIntervaloHoraBr', () => {
  it('formata faixa 23h–24h', () => {
    expect(formatIntervaloHoraBr(23)).toBe('23h–24h');
  });
});

describe('formatIntPtBrOrDash', () => {
  it('retorna traço para zero', () => {
    expect(formatIntPtBrOrDash(0)).toBe('-');
  });
});
