import { Badge } from '@/components/ui/Badge';
import {
  configTableBodyCellClass,
  configTableHeadCellClass,
} from '@/components/Config/config-table-styles';
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

export default function InsumoPedidoCompraTable({
  pedidos,
  hojeIso,
  onSelect,
}: Props) {
  return (
    <div className="hidden md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <Cabecalho label="Número" numeric />
            <Cabecalho label="Fornecedor" />
            <Cabecalho label="Chegada" />
            <Cabecalho label="Status" />
            <Cabecalho label="Itens" numeric />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {pedidos.map((pedido) => (
            <PedidoRow
              key={pedido.id}
              pedido={pedido}
              hojeIso={hojeIso}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PedidoRow({
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

  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`Abrir pedido ${pedido.numero} de ${pedido.fornecedor_nome}`}
      className={[
        'cursor-pointer transition-colors hover:bg-amber-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500',
        '[&>td]:h-14',
        atrasado ? 'bg-rose-50/60' : '',
      ].join(' ')}
      onClick={() => onSelect(pedido)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(pedido);
        }
      }}
    >
      <td
        className={`${configTableBodyCellClass} min-h-11 whitespace-nowrap font-mono tabular-nums font-semibold text-stone-900`}
      >
        {pedido.numero}
      </td>
      <td className={`${configTableBodyCellClass} min-w-48 font-medium text-stone-900`}>
        {pedido.fornecedor_nome}
      </td>
      <td
        className={`${configTableBodyCellClass} whitespace-nowrap font-mono tabular-nums text-stone-700`}
      >
        {formatDataPedidoBr(pedido.data_chegada_prevista)}
      </td>
      <td className={`${configTableBodyCellClass} py-2`}>
        <Badge tone={status.tone} icon={status.icon}>
          {status.label}
        </Badge>
      </td>
      <td
        className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}
      >
        {pedido.itens.length}
      </td>
    </tr>
  );
}

function Cabecalho({ label, numeric = false }: { label: string; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={`${configTableHeadCellClass} ${numeric ? 'text-right' : 'text-left'}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </span>
    </th>
  );
}
