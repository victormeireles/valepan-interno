import { describe, expect, it } from 'vitest';
import { sortEtiquetaFilaItems } from './etiqueta-fila-sorter';
import type { EtiquetaFilaSortable } from './etiqueta-fila-types';

const base = (overrides: Partial<EtiquetaFilaSortable>): EtiquetaFilaSortable => ({
  pedidoEmbalagemId: 'a',
  lote: null,
  pedidoCreatedAt: '2026-06-11T10:00:00Z',
  ...overrides,
});

describe('sortEtiquetaFilaItems', () => {
  it('coloca com lote antes de sem lote', () => {
    const input = [
      base({ pedidoEmbalagemId: 'sem', lote: null }),
      base({ pedidoEmbalagemId: 'com', lote: 152 }),
    ];
    const sorted = sortEtiquetaFilaItems(input);
    expect(sorted.map((i) => i.pedidoEmbalagemId)).toEqual(['com', 'sem']);
  });

  it('ordena por created_at asc dentro do grupo', () => {
    const input = [
      base({ pedidoEmbalagemId: 'b', lote: 1, pedidoCreatedAt: '2026-06-11T12:00:00Z' }),
      base({ pedidoEmbalagemId: 'a', lote: 2, pedidoCreatedAt: '2026-06-11T08:00:00Z' }),
    ];
    const sorted = sortEtiquetaFilaItems(input);
    expect(sorted.map((i) => i.pedidoEmbalagemId)).toEqual(['a', 'b']);
  });
});
