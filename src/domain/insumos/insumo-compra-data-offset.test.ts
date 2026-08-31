import { describe, expect, it } from 'vitest';
import { offsetDiasIso } from './insumo-compra-data-offset';

describe('offsetDiasIso', () => {
  it('mesmo dia = 0', () => {
    expect(offsetDiasIso('2026-08-31', '2026-08-31')).toBe(0);
  });
  it('amanhã = 1', () => {
    expect(offsetDiasIso('2026-08-31', '2026-09-01')).toBe(1);
  });
  it('passado é negativo', () => {
    expect(offsetDiasIso('2026-08-31', '2026-08-30')).toBe(-1);
  });
});
