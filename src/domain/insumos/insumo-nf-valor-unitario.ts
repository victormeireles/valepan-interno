export function calcularValorUnitarioNf(
  valorTotal: number,
  quantidadeTotal: number,
): number | null {
  if (
    !Number.isFinite(valorTotal) ||
    !Number.isFinite(quantidadeTotal) ||
    quantidadeTotal <= 0
  ) {
    return null;
  }

  return valorTotal / quantidadeTotal;
}

export function agregarValorUnitarioNfDePendencias(
  pendencias: Array<{ quantidade_nf: number; valor_total_item: number; unidade_nf: string | null }>,
): { valorUnitarioNf: number | null; unidadeNf: string | null } {
  if (pendencias.length === 0) {
    return { valorUnitarioNf: null, unidadeNf: null };
  }

  const valorTotal = pendencias.reduce((sum, item) => sum + Number(item.valor_total_item), 0);
  const quantidadeTotal = pendencias.reduce((sum, item) => sum + Number(item.quantidade_nf), 0);

  return {
    valorUnitarioNf: calcularValorUnitarioNf(valorTotal, quantidadeTotal),
    unidadeNf: pendencias[0]?.unidade_nf ?? null,
  };
}
