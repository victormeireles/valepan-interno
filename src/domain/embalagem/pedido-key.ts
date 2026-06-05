import type { Quantidade } from '@/domain/types/inventario';
import type { PedidoEmbalagemKey, PedidoEmbalagemUpsert } from '@/domain/types/pedido-embalagem';

export function normalizeObservacao(value: unknown): string {
  return (value ?? '').toString().trim();
}

export function pedidoKeyToString(key: PedidoEmbalagemKey): string {
  return [
    key.dataProducao,
    key.dataFabricacaoEtiqueta,
    key.tipoEstoqueId,
    key.produtoId,
    key.observacao,
  ].join('|');
}

export function keysEqual(a: PedidoEmbalagemKey, b: PedidoEmbalagemKey): boolean {
  return pedidoKeyToString(a) === pedidoKeyToString(b);
}

export function emptyQuantidade(): Quantidade {
  return { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
}

export function aggregateQuantidades(
  current: Quantidade,
  delta: Quantidade,
): Quantidade {
  return {
    caixas: current.caixas + delta.caixas,
    pacotes: current.pacotes + delta.pacotes,
    unidades: current.unidades + delta.unidades,
    kg: Number((Number(current.kg) + Number(delta.kg)).toFixed(3)),
  };
}

export function mergePedidoIntoMap(
  map: Map<string, PedidoEmbalagemUpsert>,
  pedido: PedidoEmbalagemUpsert,
): void {
  const id = pedidoKeyToString(pedido);
  const existing = map.get(id);
  if (!existing) {
    map.set(id, {
      ...pedido,
      quantidade: { ...pedido.quantidade },
    });
    return;
  }
  map.set(id, {
    ...existing,
    quantidade: aggregateQuantidades(existing.quantidade, pedido.quantidade),
  });
}
