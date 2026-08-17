import { describe, expect, it } from 'vitest';
import { ProdutoCustoUnitarioCalculo } from './produto-custo-unitario-calculo';
import type { ProdutoCustoVinculo } from './produto-custo-unitario-types';

const calc = new ProdutoCustoUnitarioCalculo();

function massa(): ProdutoCustoVinculo {
  return {
    tipo: 'massa',
    receitaId: 'r-massa',
    receitaNome: 'HB Padrão',
    quantidadePorProduto: 100,
    ingredientes: [
      {
        insumoId: 'farinha',
        insumoNome: 'Farinha',
        unidade: 'kg',
        quantidadePadrao: 10,
        custoUnitario: 5,
      },
      {
        insumoId: 'sal',
        insumoNome: 'Sal',
        unidade: 'kg',
        quantidadePadrao: 2,
        custoUnitario: 1,
      },
    ],
  };
}

function brilho(): ProdutoCustoVinculo {
  return {
    tipo: 'brilho',
    receitaId: 'r-brilho',
    receitaNome: 'Brilho',
    quantidadePorProduto: 100,
    ingredientes: [
      {
        insumoId: 'ovo',
        insumoNome: 'Ovo',
        unidade: 'un',
        quantidadePadrao: 2,
        custoUnitario: 1,
      },
    ],
  };
}

describe('ProdutoCustoUnitarioCalculo', () => {
  it('exemplo CMV: massa 0,52 + brilho 0,02 = 0,54', () => {
    const total = calc.calcularProduto([massa(), brilho()]);
    expect(total.custoUnitario).toBeCloseTo(0.54, 10);
    expect(total.porTipo[0].custoPorUnidade).toBeCloseTo(0.52, 10);
    expect(total.porTipo[1].custoPorUnidade).toBeCloseTo(0.02, 10);
    expect(total.insumoSemCusto).toBe(false);
  });

  it('custo_unitario null conta 0 e marca insumo_sem_custo sem tirar do total', () => {
    const vinculo = massa();
    vinculo.ingredientes[0].custoUnitario = null;
    const resultado = calc.calcularVinculo(vinculo);
    expect(resultado.custoReceita).toBe(2);
    expect(resultado.custoPorUnidade).toBeCloseTo(0.02, 10);
    expect(resultado.entraNoTotal).toBe(true);
    expect(resultado.avisos).toContain('insumo_sem_custo');
  });

  it('quantidade <= 0 não entra no total', () => {
    const vinculo = { ...massa(), quantidadePorProduto: 0 };
    const resultado = calc.calcularVinculo(vinculo);
    expect(resultado.entraNoTotal).toBe(false);
    expect(resultado.custoPorUnidade).toBe(0);
    expect(resultado.avisos).toContain('quantidade_invalida');
    expect(calc.calcularProduto([vinculo, brilho()]).custoUnitario).toBeCloseTo(0.02, 10);
  });

  it('receita sem ingredientes: custo 0 + aviso', () => {
    const vinculo = { ...massa(), ingredientes: [] };
    const resultado = calc.calcularVinculo(vinculo);
    expect(resultado.custoPorUnidade).toBe(0);
    expect(resultado.entraNoTotal).toBe(true);
    expect(resultado.avisos).toContain('sem_ingredientes');
  });

  it('override de custo vale só no Depois e insumo compartilhado afeta todos os vínculos', () => {
    const massaComOvo: ProdutoCustoVinculo = {
      ...massa(),
      ingredientes: [
        ...massa().ingredientes,
        {
          insumoId: 'ovo',
          insumoNome: 'Ovo',
          unidade: 'un',
          quantidadePadrao: 2,
          custoUnitario: 1,
        },
      ],
    };
    const comparacao = calc.comparar(
      [massaComOvo, brilho()],
      [massaComOvo, brilho()],
      { ovo: 3 },
    );
    expect(comparacao.antes.custoUnitario).toBeCloseTo(0.56, 10);
    expect(comparacao.depois.custoUnitario).toBeCloseTo(0.64, 10);
    expect(comparacao.deltaReais).toBeCloseTo(0.08, 10);
    expect(comparacao.deltaPercentual).toBeCloseTo((0.08 / 0.56) * 100, 8);
  });

  it('override preenche custo null e remove a flag no Depois', () => {
    const vinculo = massa();
    vinculo.ingredientes[0].custoUnitario = null;
    const comparacao = calc.comparar([vinculo], [vinculo], { farinha: 5 });
    expect(comparacao.antes.insumoSemCusto).toBe(true);
    expect(comparacao.depois.insumoSemCusto).toBe(false);
    expect(comparacao.depois.custoUnitario).toBeCloseTo(0.52, 10);
  });

  it('deltaPercentual é null quando Antes é 0', () => {
    const comparacao = calc.comparar([], [brilho()]);
    expect(comparacao.antes.custoUnitario).toBe(0);
    expect(comparacao.depois.custoUnitario).toBeCloseTo(0.02, 10);
    expect(comparacao.deltaPercentual).toBeNull();
  });
});
