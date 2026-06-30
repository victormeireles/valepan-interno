import { describe, expect, it } from 'vitest';
import { calcularQuantidadePorProdutoConfeito } from './receita-confeito-calculo';

describe('calcularQuantidadePorProdutoConfeito', () => {
  const ingredientes = [
    { quantidade: 2, unidade: 'kg' },
    { quantidade: 3, unidade: 'kg' },
  ];

  const gramaturas = [
    { pesoG: 65, quantidade: 1200 },
    { pesoG: 50, quantidade: 1500 },
  ];

  it('multiplica peso total da receita pelos pães por kg da gramatura', () => {
    const resultado = calcularQuantidadePorProdutoConfeito(ingredientes, gramaturas, 65);
    expect(resultado).toEqual({
      quantidade: 6000,
      totalKg: 5,
      paesPorUnidade: 1200,
      ingredientesIgnorados: 0,
      pesoTotalKg: 5,
      paesPorKg: 1200,
    });
  });

  it('retorna null sem coeficiente para a gramatura', () => {
    expect(calcularQuantidadePorProdutoConfeito(ingredientes, gramaturas, 60)).toBeNull();
  });
});
