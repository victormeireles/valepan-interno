import type { EtiquetaFilaSortable } from './etiqueta-fila-types';

export function sortEtiquetaFilaItems<T extends EtiquetaFilaSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aHasLote = a.lote != null ? 0 : 1;
    const bHasLote = b.lote != null ? 0 : 1;
    if (aHasLote !== bHasLote) return aHasLote - bHasLote;
    return a.pedidoCreatedAt.localeCompare(b.pedidoCreatedAt);
  });
}
