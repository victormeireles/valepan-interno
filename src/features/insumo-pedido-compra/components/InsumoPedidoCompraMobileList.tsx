import { Badge } from '@/components/ui/Badge';
import type { InsumoPedidoCompraListItem } from '@/data/insumos/InsumoPedidoCompraRepository';
import {
  formatDataPedidoBr,
  isPedidoAtrasado,
  pedidoStatusBadge,
} from '@/features/insumo-pedido-compra/insumo-pedido-compra-status-view';

type Props = {
  pedidos: InsumoPedidoCompraListItem[];
  hojeIso: string;
  onSelect: (pedido: InsumoPedidoCompraListItem) => void;
};

export default function InsumoPedidoCompraMobileList({
  pedidos,
  hojeIso,
  onSelect,
}: Props) {
  return (
    <div className="divide-y divide-stone-100 md:hidden">
      {pedidos.map((pedido) => (
        <PedidoCard
          key={pedido.id}
          pedido={pedido}
          hojeIso={hojeIso}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function PedidoCard({
  pedido,
  hojeIso,
  onSelect,
}: {
  pedido: InsumoPedidoCompraListItem;
  hojeIso: string;
  onSelect: (pedido: InsumoPedidoCompraListItem) => void;
}) {
  const atrasado = isPedidoAtrasado(pedido, hojeIso);
  const status = pedidoStatusBadge(pedido, hojeIso);
  const itensLabel = pedido.itens.length === 1 ? '1 item' : `${pedido.itens.length} itens`;

  return (
    <button
      type="button"
      onClick={() => onSelect(pedido)}
      aria-label={`Abrir pedido ${pedido.numero} de ${pedido.fornecedor_nome}`}
      className={[
        'flex w-full min-h-11 items-start justify-between gap-3 p-4 text-left',
        'transition-colors hover:bg-amber-50 focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500',
        atrasado ? 'bg-rose-50/60' : '',
      ].join(' ')}
    >
      <div className="min-w-0">
        <p className="font-semibold text-stone-900">{pedido.fornecedor_nome}</p>
        <p className="mt-1 font-mono text-xs tabular-nums text-stone-500">
          Pedido {pedido.numero} · {formatDataPedidoBr(pedido.data_chegada_prevista)} · {itensLabel}
        </p>
      </div>
      <Badge tone={status.tone} icon={status.icon}>
        {status.label}
      </Badge>
    </button>
  );
}
