import { describe, expect, it } from 'vitest';
import { InsumoConsumoReconcileDeltaCalculator } from './insumo-consumo-reconcile-delta-calculator';

describe('InsumoConsumoReconcileDeltaCalculator', () => {
  it('migra consumo do insumo antigo para o novo', () => {
    const deltas = InsumoConsumoReconcileDeltaCalculator.calcular(
      [{ insumoId: '560', quantidade: 10 }],
      new Map([
        ['520', -10],
        ['560', 0],
      ]),
    );

    expect(deltas).toEqual(
      expect.arrayContaining([
        { insumoId: '520', delta: 10 },
        { insumoId: '560', delta: -10 },
      ]),
    );
    expect(deltas).toHaveLength(2);
  });

  it('não gera delta quando já está no alvo', () => {
    const deltas = InsumoConsumoReconcileDeltaCalculator.calcular(
      [{ insumoId: '560', quantidade: 10 }],
      new Map([['560', -10]]),
    );
    expect(deltas).toEqual([]);
  });
});
