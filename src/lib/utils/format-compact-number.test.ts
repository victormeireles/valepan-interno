import { describe, expect, it } from 'vitest';

import { formatCompactNumber } from './format-compact-number';

describe('formatCompactNumber', () => {
  it('formata inteiro abaixo de 1.000', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(42)).toBe('42');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('formata 1.000–9.999 com 1 casa e k', () => {
    expect(formatCompactNumber(1_000)).toBe('1k');
    expect(formatCompactNumber(1_234)).toBe('1,2k');
    expect(formatCompactNumber(9_999)).toBe('10k');
  });

  it('formata 10.000–999.999 com 0 casas e k', () => {
    expect(formatCompactNumber(10_000)).toBe('10k');
    expect(formatCompactNumber(12_345)).toBe('12k');
    expect(formatCompactNumber(999_999)).toBe('1M');
  });

  it('formata milhões', () => {
    expect(formatCompactNumber(1_000_000)).toBe('1M');
    expect(formatCompactNumber(1_234_567)).toBe('1,2M');
    expect(formatCompactNumber(9_999_999)).toBe('10M');
    expect(formatCompactNumber(12_345_678)).toBe('12M');
  });

  it('preserva sinal negativo', () => {
    expect(formatCompactNumber(-1_234)).toBe('-1,2k');
  });
});
