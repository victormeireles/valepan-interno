import { describe, expect, it } from 'vitest';
import { formatPresoDuracao } from './fluxo-fila-format';

describe('formatPresoDuracao', () => {
  it('minutos curtos', () => {
    expect(formatPresoDuracao(42)).toBe('42 min');
  });
  it('horas e minutos', () => {
    expect(formatPresoDuracao(135)).toBe('2 h 15 min');
  });
});
