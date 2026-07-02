import { describe, expect, it } from 'vitest';
import { formatHourFromMinutes } from './painel-producao-format';

describe('formatHourFromMinutes', () => {
  it('formata previsao do mesmo dia', () => {
    expect(formatHourFromMinutes(20 * 60 + 35)).toBe('20h35');
  });

  it('formata previsao depois da meia-noite como amanha', () => {
    expect(formatHourFromMinutes(25 * 60 + 19)).toBe('amanhã 1h19');
  });
});
