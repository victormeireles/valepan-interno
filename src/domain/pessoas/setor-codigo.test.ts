import { describe, expect, it } from 'vitest';
import { SetorCodigo } from './setor-codigo';

describe('SetorCodigo', () => {
  it('gera código de três letras a partir do nome', () => {
    expect(new SetorCodigo().gerar('Produção', [])).toBe('PRO');
  });

  it('evita colisão com códigos já usados', () => {
    expect(new SetorCodigo().gerar('Produção', ['PRO', 'PRO2'])).toBe('PRO3');
  });
});
