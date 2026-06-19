export function calcularQuantidadeEntrada(
  quantidadeNf: number,
  fatorConversao: number,
): number {
  return quantidadeNf * fatorConversao;
}

export function calcularCustoUnitarioEntrada(
  valorTotalItem: number,
  quantidadeConvertida: number,
): number {
  if (quantidadeConvertida <= 0) {
    throw new Error('Quantidade convertida deve ser maior que zero');
  }
  return valorTotalItem / quantidadeConvertida;
}
