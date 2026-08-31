import { describe, expect, it } from 'vitest';
import { addDaysIso, offsetDiasIso } from './insumo-compra-data-offset';

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

describe('addDaysIso', () => {
  it('soma dias corridos e cruza o mês', () => {
    expect(addDaysIso('2026-08-12', 3)).toBe('2026-08-15');
    expect(addDaysIso('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('zero dias devolve a mesma data', () => {
    expect(addDaysIso('2026-08-12', 0)).toBe('2026-08-12');
  });
});
