import type {
  InsumoPedidoPipelineItem,
  InsumoPedidoPipelineResumo,
} from './insumo-pedido-compra-types';

export class InsumoPedidoPipelineAgrupador {
  agrupar(
    itens: InsumoPedidoPipelineItem[],
  ): Map<string, InsumoPedidoPipelineResumo> {
    const map = new Map<string, InsumoPedidoPipelineResumo>();

    for (const item of itens) {
      const atual = map.get(item.insumoId);
      if (!atual) {
        map.set(item.insumoId, {
          quantidade: item.quantidade,
          atrasado: item.atrasado,
          proximaData: item.dataPrevista,
          pedidoIds: [item.pedidoId],
        });
        continue;
      }

      atual.quantidade += item.quantidade;
      atual.atrasado = atual.atrasado || item.atrasado;
      atual.proximaData = this.minData(atual.proximaData, item.dataPrevista);
      atual.pedidoIds.push(item.pedidoId);
    }

    return map;
  }

  private minData(a: string | null, b: string): string {
    if (a === null || b < a) return b;
    return a;
  }
}

export const insumoPedidoPipelineAgrupador = new InsumoPedidoPipelineAgrupador();
