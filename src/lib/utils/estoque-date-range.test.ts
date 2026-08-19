import { describe, expect, it } from 'vitest';
import {
  dateInputsToIsoRange,
  formatDateInput,
  getPresetRange,
} from './estoque-date-range';

describe('getPresetRange', () => {
  const ref = new Date(2026, 5, 3, 15, 30, 0);

  it('hoje: de e ate no mesmo dia civil', () => {
    const { de, ate } = getPresetRange('hoje', ref);
    expect(de).toBe('2026-06-03');
    expect(ate).toBe('2026-06-03');
  });

  it('ontem: dia anterior', () => {
    const { de, ate } = getPresetRange('ontem', ref);
    expect(de).toBe('2026-06-02');
    expect(ate).toBe('2026-06-02');
  });

  it('7dias: de 7 dias antes ate hoje', () => {
    const { de, ate } = getPresetRange('7dias', ref);
    expect(de).toBe('2026-05-28');
    expect(ate).toBe('2026-06-03');
  });
});

describe('dateInputsToIsoRange', () => {
  it('converte inicio e fim do dia civil em Brasilia', () => {
    const { de, ate } = dateInputsToIsoRange('2026-06-03', '2026-06-03');
    expect(de).toBe('2026-06-03T00:00:00.000-03:00');
    expect(ate).toBe('2026-06-03T23:59:59.999-03:00');
  });

  it('inclui movimentos depois das 21h no mesmo dia civil BR', () => {
    const { de, ate } = dateInputsToIsoRange('2026-08-18', '2026-08-18');
    const saidaApos21h = new Date('2026-08-19T00:06:32.994Z').getTime();

    expect(new Date(de).getTime()).toBeLessThanOrEqual(saidaApos21h);
    expect(new Date(ate).getTime()).toBeGreaterThanOrEqual(saidaApos21h);
  });
});

describe('formatDateInput', () => {
  it('formata Date para yyyy-MM-dd', () => {
    expect(formatDateInput(new Date(2026, 5, 3))).toBe('2026-06-03');
  });
});
