import { describe, expect, it } from 'vitest';
import {
  aplicarDeltaComClamp,
  calcularDelta,
  calcularSaldoAntes,
  criarQuantidadeZerada,
  somarQuantidades,
} from './quantidade-calculo';

describe('somarQuantidades', () => {
  it('soma quatro campos', () => {
    const a = { caixas: 1, pacotes: 2, unidades: 3, kg: 1.5 };
    const b = { caixas: 4, pacotes: 0, unidades: 1, kg: 0.5 };
    expect(somarQuantidades(a, b)).toEqual({
      caixas: 5,
      pacotes: 2,
      unidades: 4,
      kg: 2,
    });
  });

  it('clamp em zero quando allowNegative false', () => {
    const a = { caixas: 2, pacotes: 0, unidades: 0, kg: 0 };
    const b = { caixas: -5, pacotes: 0, unidades: 0, kg: 0 };
    expect(somarQuantidades(a, b, false)).toEqual({
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    });
  });

  it('permite negativo quando allowNegative true', () => {
    const a = { caixas: 2, pacotes: 0, unidades: 0, kg: 0 };
    const b = { caixas: -5, pacotes: 0, unidades: 0, kg: 0 };
    expect(somarQuantidades(a, b, true)).toEqual({
      caixas: -3,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    });
  });
});

describe('calcularDelta', () => {
  it('calcula diferença entre duas quantidades', () => {
    const anterior = { caixas: 10, pacotes: 0, unidades: 0, kg: 0 };
    const novo = { caixas: 7, pacotes: 1, unidades: 0, kg: 0.5 };
    expect(calcularDelta(anterior, novo)).toEqual({
      caixas: -3,
      pacotes: 1,
      unidades: 0,
      kg: 0.5,
    });
  });
});

describe('aplicarDeltaComClamp', () => {
  it('retorna saldo clamped', () => {
    const atual = criarQuantidadeZerada();
    const delta = { caixas: 5, pacotes: 0, unidades: 0, kg: 0 };
    expect(aplicarDeltaComClamp(atual, delta)).toEqual({
      saldo: { caixas: 5, pacotes: 0, unidades: 0, kg: 0 },
      delta,
    });
  });
});

describe('calcularSaldoAntes', () => {
  it('subtrai delta positivo do saldo depois', () => {
    const depois = { caixas: 10, pacotes: 2, unidades: 5, kg: 1.5 };
    const delta = { caixas: 3, pacotes: 1, unidades: 2, kg: 0.5 };
    expect(calcularSaldoAntes(depois, delta)).toEqual({
      caixas: 7,
      pacotes: 1,
      unidades: 3,
      kg: 1,
    });
  });

  it('subtrai delta negativo (ajuste que reduziu estoque)', () => {
    const depois = { caixas: 7, pacotes: 0, unidades: 0, kg: 0 };
    const delta = { caixas: -3, pacotes: 0, unidades: 0, kg: 0 };
    expect(calcularSaldoAntes(depois, delta)).toEqual({
      caixas: 10,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    });
  });

  it('arredonda kg em 3 casas', () => {
    const depois = { caixas: 0, pacotes: 0, unidades: 0, kg: 1.234 };
    const delta = { caixas: 0, pacotes: 0, unidades: 0, kg: 0.111 };
    expect(calcularSaldoAntes(depois, delta)).toEqual({
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 1.123,
    });
  });

  it('não aplica clamp a zero', () => {
    const depois = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
    const delta = { caixas: 5, pacotes: 0, unidades: 0, kg: 0 };
    expect(calcularSaldoAntes(depois, delta)).toEqual({
      caixas: -5,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    });
  });
});
