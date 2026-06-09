import { describe, expect, it } from 'vitest';
import {
  aggregateQuantidades,
  mergeOrdemIntoMap,
  normalizeObservacao,
  pedidoKeyToString,
} from './pedido-key';
import type { OrdemProducaoUpsert } from '@/domain/types/ordem-producao';

const baseOrdem: OrdemProducaoUpsert = {
  dataProducao: '2026-06-03',
  dataFabricacaoEtiqueta: '2026-06-04',
  tipoEstoqueId: 'tipo-1',
  produtoId: 'prod-1',
  observacao: '',
  assadeiraId: 'ass-1',
  assadeiras: 5,
  ordemPlanejamento: 1,
  quantidade: { unidades: 120, caixas: 10, pacotes: 0, kg: 0 },
};

const ctx = { unidadesPorAssadeira: 24, boxUnits: 12 };

const baseKey = '2026-06-03|2026-06-04|tipo-1|prod-1||ass-1';

describe('normalizeObservacao', () => {
  it('trims and empty string for null', () => {
    expect(normalizeObservacao('  obs  ')).toBe('obs');
    expect(normalizeObservacao(null)).toBe('');
  });
});

describe('pedidoKeyToString', () => {
  it('includes assadeiraId as 6th segment', () => {
    expect(pedidoKeyToString(baseOrdem)).toBe(baseKey);
  });
});

describe('mergeOrdemIntoMap', () => {
  it('sums assadeiras on same key', () => {
    const map = new Map<string, OrdemProducaoUpsert>();
    mergeOrdemIntoMap(map, baseOrdem, ctx);
    mergeOrdemIntoMap(
      map,
      {
        ...baseOrdem,
        assadeiras: 3,
        quantidade: { unidades: 72, caixas: 6, pacotes: 0, kg: 0 },
      },
      ctx,
    );
    expect(map.size).toBe(1);
    expect(map.get(baseKey)?.assadeiras).toBe(8);
    expect(map.get(baseKey)?.quantidade.unidades).toBe(192);
    expect(map.get(baseKey)?.quantidade.caixas).toBe(16);
  });

  it('different assadeiraId creates separate entries', () => {
    const map = new Map<string, OrdemProducaoUpsert>();
    mergeOrdemIntoMap(map, baseOrdem, ctx);
    mergeOrdemIntoMap(map, { ...baseOrdem, assadeiraId: 'ass-2' }, ctx);
    expect(map.size).toBe(2);
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
