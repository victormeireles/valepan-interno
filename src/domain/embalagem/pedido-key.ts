import type { Quantidade } from '@/domain/types/inventario';
import type {
  OrdemProducaoKey,
  OrdemProducaoUpsert,
} from '@/domain/types/ordem-producao';
import { deriveQuantidadesFromAssadeiras } from '@/domain/producao/ordem-derivados';

export function normalizeObservacao(value: unknown): string {
  return (value ?? '').toString().trim();
}

export function pedidoKeyToString(key: OrdemProducaoKey): string {
  return [
    key.dataProducao,
    key.dataFabricacaoEtiqueta,
    key.tipoEstoqueId,
    key.produtoId,
    key.observacao,
    key.assadeiraId,
  ].join('|');
}

export function keysEqual(a: OrdemProducaoKey, b: OrdemProducaoKey): boolean {
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

export type MergeOrdemContext = {
  unidadesPorAssadeira: number;
  boxUnits: number | null;
};

export function mergeOrdemIntoMap(
  map: Map<string, OrdemProducaoUpsert>,
  ordem: OrdemProducaoUpsert,
  ctx: MergeOrdemContext,
): void {
  const id = pedidoKeyToString(ordem);
  const existing = map.get(id);
  if (!existing) {
    map.set(id, { ...ordem, quantidade: { ...ordem.quantidade } });
    return;
  }
  const totalAssadeiras = existing.assadeiras + ordem.assadeiras;
  map.set(id, {
    ...existing,
    assadeiras: totalAssadeiras,
    quantidade: deriveQuantidadesFromAssadeiras({
      assadeiras: totalAssadeiras,
      unidadesPorAssadeira: ctx.unidadesPorAssadeira,
      boxUnits: ctx.boxUnits,
    }),
  });
}

/** @deprecated Use mergeOrdemIntoMap with MergeOrdemContext (Task 5). */
export function mergePedidoIntoMap(
  map: Map<string, OrdemProducaoUpsert>,
  pedido: OrdemProducaoUpsert,
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
    assadeiras: existing.assadeiras + pedido.assadeiras,
    quantidade: aggregateQuantidades(existing.quantidade, pedido.quantidade),
  });
}
