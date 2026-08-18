export type ProdutoCustoMargem = {
  margemReais: number;
  margemPercentual: number;
};

export class ProdutoCustoMargemCalculo {
  calcular(precoVenda: number | undefined, custo: number): ProdutoCustoMargem | null {
    if (precoVenda == null || precoVenda <= 0) return null;
    const margemReais = precoVenda - custo;
    return {
      margemReais,
      margemPercentual: (margemReais / precoVenda) * 100,
    };
  }
}

export const produtoCustoMargemCalculo = new ProdutoCustoMargemCalculo();
