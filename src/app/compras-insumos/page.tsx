import {
  listarInsumosParaPedido,
  listarPedidosCompra,
} from '@/app/actions/insumo-pedido-compra-actions';
import InsumoPedidoCompraClient from '@/features/insumo-pedido-compra/InsumoPedidoCompraClient';
import { parseFiltro } from '@/features/insumo-pedido-compra/insumo-pedido-compra-filtro';

export const dynamic = 'force-dynamic';

export default async function ComprasInsumosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; insumo?: string }>;
}) {
  const { filtro, insumo } = await searchParams;
  const parsed = parseFiltro(filtro);
  const data = await listarPedidosCompra(parsed, insumo || undefined);
  const opcoes = await listarInsumosParaPedido();

  return (
    <InsumoPedidoCompraClient
      initialPedidos={data.pedidos}
      atrasados={data.atrasados}
      abertos={data.abertos}
      filtro={parsed}
      insumoId={insumo ?? null}
      insumoOpcoes={opcoes}
    />
  );
}
