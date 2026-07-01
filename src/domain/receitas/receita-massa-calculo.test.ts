import { describe, expect, it } from 'vitest';
import {
  calcularPesoTotalMassaKg,
  calcularQuantidadePorProdutoMassa,
  converterQuantidadeParaKg,
} from './receita-massa-calculo';

describe('converterQuantidadeParaKg', () => {
  it('mantém kg como está', () => {
    expect(converterQuantidadeParaKg(10, 'kg')).toBe(10);
  });

  it('trata litro como kg (1L = 1kg)', () => {
    expect(converterQuantidadeParaKg(2.5, 'L')).toBe(2.5);
    expect(converterQuantidadeParaKg(1, 'litros')).toBe(1);
  });

  it('converte gramas para kg', () => {
    expect(converterQuantidadeParaKg(500, 'g')).toBe(0.5);
  });

  it('retorna null para unidades não pesáveis', () => {
    expect(converterQuantidadeParaKg(10, 'UN')).toBeNull();
  });
});

describe('calcularPesoTotalMassaKg', () => {
  it('soma kg e litros', () => {
    const resultado = calcularPesoTotalMassaKg([
      { quantidade: 8, unidade: 'kg' },
      { quantidade: 2, unidade: 'L' },
      { quantidade: 500, unidade: 'g' },
    ]);

    expect(resultado.totalKg).toBe(10.5);
    expect(resultado.ingredientesIgnorados).toBe(0);
  });

  it('ignora ingredientes em unidade não conversível', () => {
    const resultado = calcularPesoTotalMassaKg([
      { quantidade: 10, unidade: 'kg' },
      { quantidade: 2, unidade: 'UN' },
    ]);

    expect(resultado.totalKg).toBe(10);
    expect(resultado.ingredientesIgnorados).toBe(1);
  });
});

describe('calcularQuantidadePorProdutoMassa', () => {
  it('calcula pães por receita dividindo peso total pela massa crua', () => {
    const resultado = calcularQuantidadePorProdutoMassa(
      [
        { quantidade: 5, unidade: 'kg' },
        { quantidade: 5, unidade: 'L' },
      ],
      50,
    );

    expect(resultado).toEqual({
      quantidade: 200,
      pesoTotalKg: 10,
      ingredientesIgnorados: 0,
    });
  });

  it('usa a massa crua (70g) e não a gramatura assada (65g)', () => {
    const ingredientes = [{ quantidade: 7, unidade: 'kg' }];

    // 7000 g / 70 g (massa crua) = 100 pães
    expect(calcularQuantidadePorProdutoMassa(ingredientes, 70)?.quantidade).toBe(100);
    // Confere que dividir pela gramatura assada (65) daria um número maior (errado)
    expect(calcularQuantidadePorProdutoMassa(ingredientes, 65)?.quantidade).toBe(108);
  });

  it('retorna null sem massa crua', () => {
    expect(
      calcularQuantidadePorProdutoMassa([{ quantidade: 10, unidade: 'kg' }], 0),
    ).toBeNull();
  });
});
