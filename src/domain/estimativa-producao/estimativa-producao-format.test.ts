import { describe, expect, it } from 'vitest';
import { formatEstimativaClockHHmm } from './estimativa-producao-format';

describe('formatEstimativaClockHHmm', () => {
  it('formata instante UTC como HH:mm em Brasília', () => {
    expect(formatEstimativaClockHHmm('2026-08-17T07:00:00.000-03:00')).toBe('07:00');
    expect(formatEstimativaClockHHmm('2026-08-17T21:50:00.000-03:00')).toBe('21:50');
  });

  it('retorna nulo para instante inválido', () => {
    expect(formatEstimativaClockHHmm('')).toBeNull();
    expect(formatEstimativaClockHHmm('nao-e-data')).toBeNull();
  });
});
