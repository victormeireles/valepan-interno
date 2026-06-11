import type { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

export function formatEtiquetaMeta(pedido: Quantidade): string {
  return formatQuantidade(pedido);
}

export function formatEtiquetaRealizado(produzido: Quantidade): string {
  return formatQuantidade(produzido);
}
