import type { BadgeTone } from '@/components/ui/Badge';
import type { InsumoPedidoCompraListItem } from '@/data/insumos/InsumoPedidoCompraRepository';

type PedidoStatusInput = Pick<
  InsumoPedidoCompraListItem,
  'status' | 'data_chegada_prevista'
>;

export type PedidoStatusBadgeView = {
  tone: BadgeTone;
  label: string;
  icon: string;
};

export function isPedidoAtrasado(pedido: PedidoStatusInput, hojeIso: string): boolean {
  return pedido.status === 'aberto' && pedido.data_chegada_prevista < hojeIso;
}

export function formatDataPedidoBr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export function pedidoStatusBadge(
  pedido: PedidoStatusInput,
  hojeIso: string,
): PedidoStatusBadgeView {
  if (isPedidoAtrasado(pedido, hojeIso)) {
    return { tone: 'danger', label: 'Atrasado', icon: 'schedule' };
  }
  if (pedido.status === 'encerrado') {
    return { tone: 'success', label: 'Encerrado', icon: 'check_circle' };
  }
  if (pedido.status === 'cancelado') {
    return { tone: 'neutral', label: 'Cancelado', icon: 'cancel' };
  }
  return { tone: 'accent', label: 'Aberto', icon: 'local_shipping' };
}
