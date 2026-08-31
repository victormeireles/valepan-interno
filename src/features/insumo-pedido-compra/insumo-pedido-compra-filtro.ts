import type { InsumoPedidoCompraFiltro } from '@/data/insumos/InsumoPedidoCompraRepository';

const FILTROS_VALIDOS: readonly InsumoPedidoCompraFiltro[] = [
  'abertos',
  'atrasados',
  'encerrados',
  'cancelados',
  'todos',
];

export const PEDIDO_COMPRA_FILTRO_CHIPS: Array<{
  value: InsumoPedidoCompraFiltro;
  label: string;
}> = [
  { value: 'abertos', label: 'Abertos' },
  { value: 'atrasados', label: 'Atrasados' },
  { value: 'encerrados', label: 'Encerrados' },
  { value: 'cancelados', label: 'Cancelados' },
  { value: 'todos', label: 'Todos' },
];

export function parseFiltro(filtro?: string): InsumoPedidoCompraFiltro {
  if (filtro && FILTROS_VALIDOS.includes(filtro as InsumoPedidoCompraFiltro)) {
    return filtro as InsumoPedidoCompraFiltro;
  }
  return 'abertos';
}
