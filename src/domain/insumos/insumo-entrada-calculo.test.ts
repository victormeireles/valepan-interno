import { describe, expect, it } from 'vitest';
import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from './insumo-entrada-calculo';

describe('calcularQuantidadeEntrada', () => {
  it('multiplica qtd NF pelo fator de conversão', () => {
    expect(calcularQuantidadeEntrada(3, 25)).toBe(75);
  });

  it('usa fator 1 por padrão', () => {
    expect(calcularQuantidadeEntrada(1023.3, 1)).toBe(1023.3);
  });
});

describe('calcularCustoUnitarioEntrada', () => {
  it('divide valor total pela quantidade convertida', () => {
    expect(calcularCustoUnitarioEntrada(28694.49, 1023.3)).toBeCloseTo(28.04, 1);
  });

  it('lança se quantidade convertida for zero', () => {
    expect(() => calcularCustoUnitarioEntrada(100, 0)).toThrow();
  });
});
