import { describe, expect, it } from 'vitest';
import {
  buildManualAdjustmentDisplay,
  formatAdjustmentTime,
} from './manual-adjustment-display';
import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';

const mov: EstoqueMovimentoRecord = {
  id: 'm1',
  createdAt: '2026-07-17T14:30:00.000Z',
  tipoEstoqueId: 't1',
  tipoEstoqueNome: 'Congelado',
  produtoId: 'p1',
  produtoNome: 'Brioche 90g',
  delta: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
  saldo: { caixas: 12, pacotes: 0, unidades: 0, kg: 0 },
  origem: 'ajuste_manual',
};

describe('buildManualAdjustmentDisplay', () => {
  it('deriva antes = saldo - delta e preserva nomes', () => {
    const row = buildManualAdjustmentDisplay(mov);
    expect(row.tipoEstoqueNome).toBe('Congelado');
    expect(row.produtoNome).toBe('Brioche 90g');
    expect(row.antes).toEqual({ caixas: 10, pacotes: 0, unidades: 0, kg: 0 });
    expect(row.depois).toEqual(mov.saldo);
  });
});

describe('formatAdjustmentTime', () => {
  it('retorna só hora quando showDate false', () => {
    const text = formatAdjustmentTime(mov.createdAt, false);
    expect(text).toMatch(/\d{2}:\d{2}/);
    expect(text).not.toContain('·');
  });

  it('inclui dd/MM quando showDate true', () => {
    const text = formatAdjustmentTime(mov.createdAt, true);
    expect(text).toContain('·');
    expect(text).toMatch(/\d{2}\/\d{2}/);
  });
});
