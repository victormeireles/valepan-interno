import type { EtiquetaFilaItem, EtiquetaFilaSortable } from './etiqueta-fila-types';

export function sortEtiquetaGeradosFilaItems(items: EtiquetaFilaItem[]): EtiquetaFilaItem[] {
  return [...items].sort((a, b) => {
    const byGerado = (a.geradoEm ?? '').localeCompare(b.geradoEm ?? '');
    if (byGerado !== 0) return byGerado;
    return a.pedidoEmbalagemId.localeCompare(b.pedidoEmbalagemId);
  });
}

export function sortEtiquetaFilaItems<T extends EtiquetaFilaSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aHasLote = a.primeiroLoteCreatedAt != null ? 0 : 1;
    const bHasLote = b.primeiroLoteCreatedAt != null ? 0 : 1;
    if (aHasLote !== bHasLote) return aHasLote - bHasLote;
    if (a.primeiroLoteCreatedAt && b.primeiroLoteCreatedAt) {
      const byLoteCreatedAt = a.primeiroLoteCreatedAt.localeCompare(b.primeiroLoteCreatedAt);
      if (byLoteCreatedAt !== 0) return byLoteCreatedAt;
    }
    return a.pedidoEmbalagemId.localeCompare(b.pedidoEmbalagemId);
  });
}
