import { describe, expect, it } from 'vitest';
import {
  aggregateQuantidades,
  mergePedidoIntoMap,
  normalizeObservacao,
} from './pedido-key';
import type { PedidoEmbalagemUpsert } from '@/domain/types/pedido-embalagem';

const base: PedidoEmbalagemUpsert = {
  dataProducao: '2026-06-03',
  dataFabricacaoEtiqueta: '2026-06-04',
  tipoEstoqueId: 'tipo-1',
  produtoId: 'prod-1',
  observacao: '',
  quantidade: { caixas: 10, pacotes: 0, unidades: 0, kg: 0 },
};

describe('normalizeObservacao', () => {
  it('trims and empty string for null', () => {
    expect(normalizeObservacao('  obs  ')).toBe('obs');
    expect(normalizeObservacao(null)).toBe('');
  });
});

describe('mergePedidoIntoMap', () => {
  it('merges duplicate keys summing quantities', () => {
    const map = new Map<string, PedidoEmbalagemUpsert>();
    mergePedidoIntoMap(map, base);
    mergePedidoIntoMap(map, {
      ...base,
      quantidade: { caixas: 5, pacotes: 1, unidades: 0, kg: 2 },
    });
    expect(map.size).toBe(1);
    expect(map.get('2026-06-03|2026-06-04|tipo-1|prod-1|')?.quantidade).toEqual({
      caixas: 15,
      pacotes: 1,
      unidades: 0,
      kg: 2,
    });
  });
});

describe('aggregateQuantidades', () => {
  it('sums kg with 3 decimals', () => {
    expect(
      aggregateQuantidades(
        { caixas: 0, pacotes: 0, unidades: 0, kg: 1.1 },
        { caixas: 0, pacotes: 0, unidades: 0, kg: 2.22 },
      ).kg,
    ).toBe(3.32);
  });
});
