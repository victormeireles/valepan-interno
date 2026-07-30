import { describe, expect, it } from 'vitest';
import { formatarCnpj, isCnpjValido, normalizarCnpj } from './insumo-cnpj';

describe('normalizarCnpj', () => {
  it('remove máscara e aceita 14 dígitos', () => {
    expect(normalizarCnpj('11.725.898/0001-81')).toBe('11725898000181');
  });

  it('retorna null se não tiver 14 dígitos', () => {
    expect(normalizarCnpj('123')).toBeNull();
    expect(normalizarCnpj(null)).toBeNull();
    expect(normalizarCnpj('CLEAN MIX')).toBeNull();
  });
});

describe('formatarCnpj', () => {
  it('formata para exibição', () => {
    expect(formatarCnpj('11725898000181')).toBe('11.725.898/0001-81');
  });
});

describe('isCnpjValido', () => {
  it('exige 14 dígitos', () => {
    expect(isCnpjValido('11725898000181')).toBe(true);
    expect(isCnpjValido('1172589800018')).toBe(false);
  });
});
