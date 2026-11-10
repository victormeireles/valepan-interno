import { describe, expect, it } from 'vitest';
import { QuantidadeEstoque } from './quantidade-estoque';

describe('QuantidadeEstoque', () => {
  const quantidade = new QuantidadeEstoque();

  it('converte texto em milésimos, com vírgula ou ponto e no máximo 3 casas', () => {
    expect(quantidade.emMilesimos('1')).toBe(1000);
    expect(quantidade.emMilesimos('1,5')).toBe(1500);
    expect(quantidade.emMilesimos('0.001')).toBe(1);
  });

  it('recusa vazio, zero, negativo, mais de 3 casas e texto', () => {
    expect(quantidade.emMilesimos('')).toBeNull();
    expect(quantidade.emMilesimos('0')).toBeNull();
    expect(quantidade.emMilesimos('-1')).toBeNull();
    expect(quantidade.emMilesimos('1,2345')).toBeNull();
    expect(quantidade.emMilesimos('abc')).toBeNull();
  });

  it('formata milésimos com vírgula e sem zeros à direita', () => {
    expect(quantidade.formatar(1500)).toBe('1,5');
    expect(quantidade.formatar(-2500)).toBe('-2,5');
  });
});
