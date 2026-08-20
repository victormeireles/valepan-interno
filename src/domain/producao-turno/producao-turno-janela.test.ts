import { describe, expect, it } from 'vitest';
import { isClockInJanela } from './producao-turno-janela';

describe('isClockInJanela', () => {
  it('inclui o início e exclui o fim (fronteira vai para o próximo)', () => {
    expect(isClockInJanela(7 * 60, '07:00', '14:00')).toBe(true);
    expect(isClockInJanela(14 * 60, '07:00', '14:00')).toBe(false);
    expect(isClockInJanela(14 * 60, '14:00', '22:00')).toBe(true);
  });

  it('aceita overnight', () => {
    expect(isClockInJanela(23 * 60, '22:00', '05:00')).toBe(true);
    expect(isClockInJanela(2 * 60, '22:00', '05:00')).toBe(true);
    expect(isClockInJanela(5 * 60, '22:00', '05:00')).toBe(false);
    expect(isClockInJanela(12 * 60, '22:00', '05:00')).toBe(false);
  });

  it('rejeita duração zero', () => {
    expect(isClockInJanela(7 * 60, '07:00', '07:00')).toBe(false);
  });
});
