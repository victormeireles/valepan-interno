import { describe, expect, it } from 'vitest';
import { CustoMedio } from './custo-medio';

describe('CustoMedio', () => {
  const custo = new CustoMedio();

  it('pondera a entrada quando há saldo positivo e custo', () => {
    expect(custo.entrada(10000, 100, 10000, 200)).toEqual({
      saldoMilesimos: 20000,
      custoMedioCentavos: 150,
    });
  });

  it('arredonda o empate da entrada para cima', () => {
    expect(custo.entrada(1000, 1, 1000, 2)).toEqual({
      saldoMilesimos: 2000,
      custoMedioCentavos: 2,
    });
  });

  it('usa o preço da entrada quando o saldo é zero', () => {
    expect(custo.entrada(0, null, 5000, 300)).toEqual({
      saldoMilesimos: 5000,
      custoMedioCentavos: 300,
    });
  });

  it('usa o preço da entrada quando o saldo é negativo', () => {
    expect(custo.entrada(-2000, 100, 4000, 50)).toEqual({
      saldoMilesimos: 2000,
      custoMedioCentavos: 50,
    });
  });

  it('reduz o saldo na saída e mantém o custo como preço do movimento', () => {
    expect(custo.saida(10000, 100, 3000)).toEqual({
      saldoMilesimos: 7000,
      custoMedioCentavos: 100,
      precoUnitarioCentavos: 100,
    });
  });

  it('sai sem custo com preço do movimento zero', () => {
    expect(custo.saida(1000, null, 500)).toEqual({
      saldoMilesimos: 500,
      custoMedioCentavos: null,
      precoUnitarioCentavos: 0,
    });
  });

  it('valor nulo ou saldo zero vale zero e o empate sobe, inclusive no negativo', () => {
    expect(custo.valorCentavos(0, 100)).toBe(0);
    expect(custo.valorCentavos(1500, 1)).toBe(2);
    expect(custo.valorCentavos(-1500, 1)).toBe(-1);
    expect(custo.valorCentavos(1000, null)).toBe(0);
  });

  it('arredonda saldo negativo para o centavo mais próximo, com empate para cima', () => {
    expect(custo.valorCentavos(-1600, 1)).toBe(-2);
    expect(custo.valorCentavos(-1900, 1)).toBe(-2);
    expect(custo.valorCentavos(-600, 1)).toBe(-1);
    expect(custo.valorCentavos(-1400, 1)).toBe(-1);
    expect(custo.valorCentavos(-1500, 1)).toBe(-1);
  });
});
