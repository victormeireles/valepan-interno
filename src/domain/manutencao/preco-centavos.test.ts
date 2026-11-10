import { describe, expect, it } from 'vitest';
import { PrecoCentavos } from './preco-centavos';

describe('PrecoCentavos', () => {
  const preco = new PrecoCentavos();

  it('converte reais em centavos, com no máximo 2 casas, e aceita zero', () => {
    expect(preco.parse('10')).toBe(1000);
    expect(preco.parse('10,5')).toBe(1050);
    expect(preco.parse('10,50')).toBe(1050);
    expect(preco.parse('0')).toBe(0);
  });

  it('recusa vazio, negativo, mais de 2 casas e texto', () => {
    expect(preco.parse('')).toBeNull();
    expect(preco.parse('-1')).toBeNull();
    expect(preco.parse('10,505')).toBeNull();
    expect(preco.parse('abc')).toBeNull();
  });

  it('formata centavos com duas casas e vírgula', () => {
    expect(preco.formatar(1050)).toBe('10,50');
  });
});
