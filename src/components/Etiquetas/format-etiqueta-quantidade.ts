import type { Quantidade } from '@/domain/types/inventario';
import { buildEmbalagemDisplayEntries } from '@/domain/embalagem/painel-quantidade';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';

function formatEmbalagemQuantidade(quantidade: Quantidade): string {
  const entries = buildEmbalagemDisplayEntries(quantidade);
  return new QuantityBreakdown(entries).format(0, 'cx');
}

export function formatEtiquetaMeta(pedido: Quantidade): string {
  return formatEmbalagemQuantidade(pedido);
}

export function formatEtiquetaRealizado(produzido: Quantidade): string {
  return formatEmbalagemQuantidade(produzido);
}
