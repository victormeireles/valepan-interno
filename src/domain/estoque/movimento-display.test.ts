import { describe, expect, it } from 'vitest';
import { formatDeltaLines } from './movimento-display';
import type { Quantidade } from '@/domain/types/inventario';

describe('formatDeltaLines', () => {
  it('retorna só dimensões não zero com sinal', () => {
    const delta: Quantidade = { caixas: 2, pacotes: -1, unidades: 0, kg: 0 };
    expect(formatDeltaLines(delta)).toEqual([
      { field: 'cx', value: 2, signed: '+2' },
      { field: 'pct', value: -1, signed: '-1' },
    ]);
  });

  it('retorna array vazio se tudo zero', () => {
    const delta: Quantidade = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
    expect(formatDeltaLines(delta)).toEqual([]);
  });
});
