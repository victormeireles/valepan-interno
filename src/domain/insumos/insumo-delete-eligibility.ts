export type InsumoDeleteBlocker = 'receitas' | 'omie' | 'movimentos' | 'pedidos';

export function podeExcluirInsumo(
  receitasCount: number,
  vinculosOmieCount: number,
): boolean {
  return receitasCount === 0 && vinculosOmieCount === 0;
}

export function resolverBloqueiosExclusaoInsumo(input: {
  receitasCount: number;
  vinculosOmieCount: number;
  movimentosCount: number;
  pedidosCount: number;
}): InsumoDeleteBlocker[] {
  const blockers: InsumoDeleteBlocker[] = [];

  if (input.receitasCount > 0) blockers.push('receitas');
  if (input.vinculosOmieCount > 0) blockers.push('omie');
  if (input.movimentosCount > 0) blockers.push('movimentos');
  if (input.pedidosCount > 0) blockers.push('pedidos');

  return blockers;
}

export function formatarMotivoBloqueioExclusaoInsumo(
  blockers: InsumoDeleteBlocker[],
): string {
  if (blockers.length === 0) return '';

  const temReceitas = blockers.includes('receitas');
  const temOmie = blockers.includes('omie');
  const temMovimentos = blockers.includes('movimentos');
  const temPedidos = blockers.includes('pedidos');

  if (temReceitas && temOmie) {
    return 'Insumo vinculado a receitas e produtos Omie. Remova os vínculos antes de excluir.';
  }
  if (temReceitas) {
    return 'Insumo usado em receitas. Remova das receitas antes de excluir.';
  }
  if (temOmie) {
    return 'Insumo vinculado a produtos Omie. Remova os vínculos antes de excluir.';
  }
  if (temMovimentos) {
    return 'Insumo possui movimentações de estoque e não pode ser excluído.';
  }
  if (temPedidos) {
    return 'Insumo vinculado a pedidos de compra e não pode ser excluído.';
  }

  return 'Não é possível excluir este insumo.';
}
