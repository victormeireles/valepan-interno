import { describe, expect, it } from 'vitest';
import { calcularQuantidadePorProdutoBrilho } from './receita-brilho-calculo';

describe('calcularQuantidadePorProdutoBrilho', () => {
  const ingredientes = [
    { quantidade: 2, unidade: 'L' },
    { quantidade: 3, unidade: 'kg' },
  ];

  const gramaturas = [
    { pesoG: 65, quantidade: 4888 },
    { pesoG: 50, quantidade: 5000 },
  ];

  it('multiplica volume da receita pelos pães por litro da gramatura', () => {
    const resultado = calcularQuantidadePorProdutoBrilho(ingredientes, gramaturas, 65);
    expect(resultado).toEqual({
      quantidade: 24440,
      totalKg: 5,
      paesPorUnidade: 4888,
      volumeLitros: 5,
      paesPorLitro: 4888,
      ingredientesIgnorados: 0,
    });
  });

  it('retorna null sem coeficiente para a gramatura', () => {
    expect(calcularQuantidadePorProdutoBrilho(ingredientes, gramaturas, 60)).toBeNull();
  });
});
