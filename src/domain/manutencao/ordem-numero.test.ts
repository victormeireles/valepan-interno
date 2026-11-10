import { describe, expect, it } from 'vitest';
import { OrdemNumero } from './ordem-numero';

describe('OrdemNumero', () => {
  const numero = new OrdemNumero();

  it('formata o inteiro com prefixo OS e cinco dígitos', () => {
    expect(numero.formatar(1)).toBe('OS-00001');
    expect(numero.formatar(42)).toBe('OS-00042');
  });

  it('mantém o sexto dígito quando a sequência passa de 99999', () => {
    expect(numero.formatar(100000)).toBe('OS-100000');
  });

  it('lê o número a partir do texto formatado', () => {
    expect(numero.parse('OS-00001')).toBe(1);
    expect(numero.parse('OS-00042')).toBe(42);
    expect(numero.parse('OS-100000')).toBe(100000);
  });

  it('recusa texto que não é uma ordem', () => {
    expect(numero.parse('')).toBeNull();
    expect(numero.parse('os-00001')).toBeNull();
    expect(numero.parse('OS-')).toBeNull();
    expect(numero.parse('00001')).toBeNull();
    expect(numero.parse('OS-00001 ')).toBeNull();
    expect(numero.parse('OS-10a')).toBeNull();
  });
});
