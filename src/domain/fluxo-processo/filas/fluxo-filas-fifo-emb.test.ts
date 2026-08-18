import { describe, expect, it } from 'vitest';
import { FluxoFilasFifoEmb } from './fluxo-filas-fifo-emb';
import type { FluxoFilasOpInput } from './fluxo-filas-types';

const fifo = new FluxoFilasFifoEmb();

const ops: FluxoFilasOpInput[] = [
  { id: 'op-1', ordemPlanejamento: 1, produtoNome: 'A', assadeiraNome: 'X', unidades: 100 },
  { id: 'op-2', ordemPlanejamento: 2, produtoNome: 'B', assadeiraNome: 'Y', unidades: 50 },
];

describe('FluxoFilasFifoEmb', () => {
  it('aloca emb parcial na primeira OP e resto na segunda', () => {
    const map = fifo.alocarUnidades(ops, [
      {
        ordemProducaoId: undefined,
        produtoNome: 'A',
        assadeiraNome: 'X',
        unidades: 120,
        produzidoEm: '2026-08-12T14:00:00-03:00',
        dataOp: '2026-08-12',
      },
    ]);
    expect(map.get('op-1')).toBe(100);
    expect(map.get('op-2')).toBe(20);
  });

  it('retorna zero para OPs sem emb', () => {
    const map = fifo.alocarUnidades(ops, []);
    expect(map.get('op-1')).toBe(0);
    expect(map.get('op-2')).toBe(0);
  });
});
