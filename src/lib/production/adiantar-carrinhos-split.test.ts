import { describe, expect, it } from 'vitest';
import {
  dividirLatasEmCarrinhos,
  LATAS_POR_CARRINHO_ADIANTADO,
  MAX_CARRINHOS_ADIANTADOS,
  nomesCarrinhosAdiantados,
  planejarCarrinhosAdiantados,
} from './adiantar-carrinhos-split';

describe('dividirLatasEmCarrinhos', () => {
  it('quebra 100 em cinco carrinhos de 20', () => {
    expect(dividirLatasEmCarrinhos(100)).toEqual([20, 20, 20, 20, 20]);
  });

  it('cria um carrinho para 20 latas', () => {
    expect(dividirLatasEmCarrinhos(20)).toEqual([20]);
  });

  it('coloca o resto no último carrinho', () => {
    expect(dividirLatasEmCarrinhos(50)).toEqual([20, 20, 10]);
  });

  it('arredonda e cria um carrinho mínimo para valores pequenos', () => {
    expect(dividirLatasEmCarrinhos(1)).toEqual([1]);
  });

  it('retorna vazio para zero ou negativo', () => {
    expect(dividirLatasEmCarrinhos(0)).toEqual([]);
    expect(dividirLatasEmCarrinhos(-5)).toEqual([]);
  });

  it('respeita o teto de carrinhos', () => {
    const r = dividirLatasEmCarrinhos((MAX_CARRINHOS_ADIANTADOS + 10) * LATAS_POR_CARRINHO_ADIANTADO);
    expect(r.length).toBe(MAX_CARRINHOS_ADIANTADOS);
  });
});

describe('nomesCarrinhosAdiantados', () => {
  it('usa nomes padrão quando não há informados', () => {
    expect(nomesCarrinhosAdiantados(3)).toEqual(['Adiantado 1', 'Adiantado 2', 'Adiantado 3']);
  });

  it('usa os números informados quando presentes', () => {
    expect(nomesCarrinhosAdiantados(3, ['67', '', '  102 '])).toEqual([
      '67',
      'Adiantado 2',
      '102',
    ]);
  });
});

describe('planejarCarrinhosAdiantados', () => {
  it('combina divisão e nomes (brioche 100 LT)', () => {
    expect(planejarCarrinhosAdiantados(100)).toEqual([
      { numero: 'Adiantado 1', latas: 20 },
      { numero: 'Adiantado 2', latas: 20 },
      { numero: 'Adiantado 3', latas: 20 },
      { numero: 'Adiantado 4', latas: 20 },
      { numero: 'Adiantado 5', latas: 20 },
    ]);
  });

  it('aplica números informados parciais', () => {
    expect(planejarCarrinhosAdiantados(50, ['A', 'B'])).toEqual([
      { numero: 'A', latas: 20 },
      { numero: 'B', latas: 20 },
      { numero: 'Adiantado 3', latas: 10 },
    ]);
  });
});
