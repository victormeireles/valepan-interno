import { describe, expect, it } from 'vitest';
import { resolveUnidadesPorAssadeiraEfetiva } from './assadeira-factor';

describe('resolveUnidadesPorAssadeiraEfetiva', () => {
  it('usa override do produto quando presente', () => {
    expect(
      resolveUnidadesPorAssadeiraEfetiva({ produto: 24, assadeira: 18 }),
    ).toBe(24);
  });

  it('cai para default da assadeira quando produto é null', () => {
    expect(
      resolveUnidadesPorAssadeiraEfetiva({ produto: null, assadeira: 18 }),
    ).toBe(18);
  });

  it('retorna null quando ambos são null', () => {
    expect(
      resolveUnidadesPorAssadeiraEfetiva({ produto: null, assadeira: null }),
    ).toBeNull();
  });

  it('retorna null quando fator <= 0', () => {
    expect(
      resolveUnidadesPorAssadeiraEfetiva({ produto: 0, assadeira: 18 }),
    ).toBeNull();
  });
});
