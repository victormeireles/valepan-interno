import { describe, expect, it } from 'vitest';
import { InsumoConsumoCoberturaCalculator } from './insumo-consumo-cobertura-calculator';

describe('InsumoConsumoCoberturaCalculator', () => {
  const calculator = new InsumoConsumoCoberturaCalculator();

  it('calcula media e cobertura semanal (estoque * 7 / media)', () => {
    const result = calculator.calculate({
      visualizacao: 'semanal',
      estoqueAtual: 100,
      consumos: [70, 70, 70, 70],
    });

    expect(result.media).toBe(70);
    expect(result.pico).toBe(70);
    // 100 / (70/7) = 10
    expect(result.coberturaDias).toBe(10);
    expect(result.coberturaPicoDias).toBe(10);
  });

  it('usa pico semanal distinto da media', () => {
    const result = calculator.calculate({
      visualizacao: 'semanal',
      estoqueAtual: 140,
      consumos: [70, 100, 40, 50],
    });

    expect(result.media).toBe(65);
    expect(result.pico).toBe(100);
    // 140 * 7 / 65 ≈ 15.076 → 15
    expect(result.coberturaDias).toBe(15);
    // 140 * 7 / 100 = 9.8 → 10
    expect(result.coberturaPicoDias).toBe(10);
  });

  it('calcula cobertura diaria como estoque / media', () => {
    const result = calculator.calculate({
      visualizacao: 'diaria',
      estoqueAtual: 50,
      consumos: [10, 10, 10, 10, 10],
    });

    expect(result.media).toBe(10);
    expect(result.pico).toBe(10);
    expect(result.coberturaDias).toBe(5);
    expect(result.coberturaPicoDias).toBe(5);
  });

  it('usa dia de maior consumo como pico na diaria', () => {
    const result = calculator.calculate({
      visualizacao: 'diaria',
      estoqueAtual: 30,
      consumos: [5, 20, 5],
    });

    expect(result.media).toBe(10);
    expect(result.pico).toBe(20);
    expect(result.coberturaDias).toBe(3);
    expect(result.coberturaPicoDias).toBe(2);
  });

  it('retorna cobertura null quando media/pico sao zero', () => {
    const result = calculator.calculate({
      visualizacao: 'semanal',
      estoqueAtual: 40,
      consumos: [0, 0, 0, 0],
    });

    expect(result.media).toBe(0);
    expect(result.pico).toBe(0);
    expect(result.coberturaDias).toBeNull();
    expect(result.coberturaPicoDias).toBeNull();
  });

  it('retorna 0 dias quando estoque e <= 0 e ha consumo', () => {
    const result = calculator.calculate({
      visualizacao: 'semanal',
      estoqueAtual: 0,
      consumos: [10, 10, 10, 10],
    });

    expect(result.coberturaDias).toBe(0);
    expect(result.coberturaPicoDias).toBe(0);
  });

  it('retorna 0 dias quando estoque e negativo e ha consumo', () => {
    const result = calculator.calculate({
      visualizacao: 'semanal',
      estoqueAtual: -5,
      consumos: [10, 10, 10, 10],
    });

    expect(result.coberturaDias).toBe(0);
    expect(result.coberturaPicoDias).toBe(0);
  });

  it('retorna media 0 e coberturas null com lista vazia', () => {
    const result = calculator.calculate({
      visualizacao: 'semanal',
      estoqueAtual: 10,
      consumos: [],
    });

    expect(result.media).toBe(0);
    expect(result.pico).toBe(0);
    expect(result.coberturaDias).toBeNull();
    expect(result.coberturaPicoDias).toBeNull();
  });
});
