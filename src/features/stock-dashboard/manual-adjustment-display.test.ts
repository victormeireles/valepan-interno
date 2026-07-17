import { describe, expect, it } from 'vitest';
import {
  buildCxPctDeltaChips,
  buildManualAdjustmentDisplay,
  formatAdjustmentTime,
  tipoEstoqueBadgeClass,
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
    expect(row.delta).toEqual(mov.delta);
  });
});

describe('buildCxPctDeltaChips', () => {
  it('sempre retorna cx e pct, com +0 no pct quando só cx sobe', () => {
    expect(
      buildCxPctDeltaChips({ caixas: 3, pacotes: 0, unidades: 0, kg: 0 }),
    ).toEqual([
      { unit: 'cx', value: 3, signedLabel: '+3', tone: 'positive' },
      { unit: 'pct', value: 0, signedLabel: '+0', tone: 'positive' },
    ]);
  });

  it('usa -0 em cx quando só pct cai', () => {
    expect(
      buildCxPctDeltaChips({ caixas: 0, pacotes: -4, unidades: 0, kg: 0 }),
    ).toEqual([
      { unit: 'cx', value: 0, signedLabel: '-0', tone: 'negative' },
      { unit: 'pct', value: -4, signedLabel: '-4', tone: 'negative' },
    ]);
  });

  it('mostra ambos positivos', () => {
    expect(
      buildCxPctDeltaChips({ caixas: 5, pacotes: 2, unidades: 0, kg: 0 }),
    ).toEqual([
      { unit: 'cx', value: 5, signedLabel: '+5', tone: 'positive' },
      { unit: 'pct', value: 2, signedLabel: '+2', tone: 'positive' },
    ]);
  });
});

describe('tipoEstoqueBadgeClass', () => {
  it('é estável para o mesmo id', () => {
    expect(tipoEstoqueBadgeClass('t1')).toBe(tipoEstoqueBadgeClass('t1'));
  });

  it('varia entre ids diferentes (em geral)', () => {
    const a = tipoEstoqueBadgeClass('tipo-alpha');
    const b = tipoEstoqueBadgeClass('tipo-omega');
    expect(a).not.toBe(b);
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
