import { describe, expect, it } from 'vitest';
import { CpfVerificador } from './cpf-verificador';

describe('CpfVerificador', () => {
  it('aceita CPF de exemplo com dígito válido', () => {
    expect(new CpfVerificador().verificar('52998224725')).toBe(true);
  });

  it('recusa sequência repetida inválida', () => {
    expect(new CpfVerificador().verificar('11111111111')).toBe(false);
  });
});
