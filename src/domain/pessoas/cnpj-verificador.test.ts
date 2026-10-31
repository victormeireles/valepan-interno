import { describe, expect, it } from 'vitest';
import { CnpjVerificador } from './cnpj-verificador';

describe('CnpjVerificador', () => {
  const verificador = new CnpjVerificador();

  it('aceita CNPJ com dígitos verificadores', () => {
    expect(verificador.verificar('11444777000161')).toBe(true);
  });

  it('recusa tamanho, repetido e dígito errado', () => {
    expect(verificador.verificar('1144477700016')).toBe(false);
    expect(verificador.verificar('11111111111111')).toBe(false);
    expect(verificador.verificar('11444777000162')).toBe(false);
  });
});
