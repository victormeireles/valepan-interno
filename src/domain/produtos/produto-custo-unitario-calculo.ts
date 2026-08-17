import type {
  ProdutoCustoComparacao,
  ProdutoCustoIngrediente,
  ProdutoCustoTotal,
  ProdutoCustoVinculo,
  ProdutoCustoVinculoAviso,
  ProdutoCustoVinculoResultado,
} from './produto-custo-unitario-types';

export class ProdutoCustoUnitarioCalculo {
  calcularVinculo(
    vinculo: ProdutoCustoVinculo,
    custoOverrides: Record<string, number> = {},
  ): ProdutoCustoVinculoResultado {
    if (vinculo.quantidadePorProduto <= 0) {
      return this.resultadoBase(vinculo, {
        entraNoTotal: false,
        custoReceita: 0,
        custoPorUnidade: 0,
        avisos: ['quantidade_invalida'],
      });
    }

    const avisos: ProdutoCustoVinculoAviso[] = [];
    if (vinculo.ingredientes.length === 0) {
      avisos.push('sem_ingredientes');
    }

    const custoReceita = this.somarCustoReceita(
      vinculo.ingredientes,
      custoOverrides,
      avisos,
    );

    return this.resultadoBase(vinculo, {
      entraNoTotal: true,
      custoReceita,
      custoPorUnidade: custoReceita / vinculo.quantidadePorProduto,
      avisos,
    });
  }

  calcularProduto(
    vinculos: ProdutoCustoVinculo[],
    custoOverrides: Record<string, number> = {},
  ): ProdutoCustoTotal {
    const porTipo = vinculos.map((vinculo) =>
      this.calcularVinculo(vinculo, custoOverrides),
    );
    const custoUnitario = porTipo.reduce(
      (soma, item) => (item.entraNoTotal ? soma + item.custoPorUnidade : soma),
      0,
    );
    return {
      custoUnitario,
      porTipo,
      insumoSemCusto: porTipo.some((item) => item.avisos.includes('insumo_sem_custo')),
    };
  }

  comparar(
    antes: ProdutoCustoVinculo[],
    depois: ProdutoCustoVinculo[],
    custoOverridesDepois: Record<string, number> = {},
  ): ProdutoCustoComparacao {
    const totalAntes = this.calcularProduto(antes);
    const totalDepois = this.calcularProduto(depois, custoOverridesDepois);
    const deltaReais = totalDepois.custoUnitario - totalAntes.custoUnitario;
    return {
      antes: totalAntes,
      depois: totalDepois,
      deltaReais,
      deltaPercentual:
        totalAntes.custoUnitario === 0
          ? null
          : (deltaReais / totalAntes.custoUnitario) * 100,
    };
  }

  private somarCustoReceita(
    ingredientes: ProdutoCustoIngrediente[],
    custoOverrides: Record<string, number>,
    avisos: ProdutoCustoVinculoAviso[],
  ): number {
    let custoReceita = 0;
    let insumoSemCusto = false;

    for (const ingrediente of ingredientes) {
      const custo =
        custoOverrides[ingrediente.insumoId] ?? ingrediente.custoUnitario;
      if (custo == null) {
        insumoSemCusto = true;
        continue;
      }
      custoReceita += ingrediente.quantidadePadrao * custo;
    }

    if (insumoSemCusto) avisos.push('insumo_sem_custo');
    return custoReceita;
  }

  private resultadoBase(
    vinculo: ProdutoCustoVinculo,
    extra: Pick<
      ProdutoCustoVinculoResultado,
      'entraNoTotal' | 'custoReceita' | 'custoPorUnidade' | 'avisos'
    >,
  ): ProdutoCustoVinculoResultado {
    return {
      tipo: vinculo.tipo,
      receitaId: vinculo.receitaId,
      receitaNome: vinculo.receitaNome,
      ...extra,
    };
  }
}

export const produtoCustoUnitarioCalculo = new ProdutoCustoUnitarioCalculo();
