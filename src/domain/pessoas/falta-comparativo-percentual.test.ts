import { describe, expect, it } from 'vitest';
import { FaltaComparativoPercentual } from './falta-comparativo-percentual';

describe('FaltaComparativoPercentual', () => {
  const comparativo = new FaltaComparativoPercentual();

  it('troca o desvio absoluto pela variação percentual', () => {
    expect(comparativo.texto(77, 99)).toBe('−22% vs mês anterior');
    expect(comparativo.texto(26, 30)).toBe('−13% vs mês anterior');
    expect(comparativo.texto(13, 18)).toBe('−28% vs mês anterior');
    expect(comparativo.texto(8, 5)).toBe('+60% vs mês anterior');
    expect(comparativo.texto(5, 3)).toBe('+67% vs mês anterior');
  });

  it('trata empate, base zero e variação menor que 1%', () => {
    expect(comparativo.texto(12, 12)).toBe('Igual ao mês anterior');
    expect(comparativo.texto(4, 0)).toBe('Sem mês anterior');
    expect(comparativo.texto(1002, 1000)).toBe('+<1% vs mês anterior');
    expect(comparativo.texto(998, 1000)).toBe('−<1% vs mês anterior');
  });
});
