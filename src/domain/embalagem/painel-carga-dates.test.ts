import { describe, expect, it } from 'vitest';
import { resolveCargaComparisonDates } from '@/domain/embalagem/painel-carga-dates';

describe('resolveCargaComparisonDates', () => {
  it('calcula D-7', () => {
    expect(resolveCargaComparisonDates('2026-06-05').dateSemana).toBe('2026-05-29');
  });
});
