import { describe, expect, it } from 'vitest';
import {
  buildReconcileResult,
  buildSnapshotMap,
  consolidateSnapshotEntries,
  hasReconcileIssues,
  quantidadesIguais,
  reconcileEstoque,
  type EstoqueSnapshotEntry,
} from './estoque-reconcile';

const entry = (
  tipo: string,
  produto: string,
  quantidade: Partial<EstoqueSnapshotEntry['quantidade']>,
): EstoqueSnapshotEntry => ({
  tipoEstoque: tipo,
  produto,
  quantidade: {
    caixas: quantidade.caixas ?? 0,
    pacotes: quantidade.pacotes ?? 0,
    unidades: quantidade.unidades ?? 0,
    kg: quantidade.kg ?? 0,
  },
});

describe('consolidateSnapshotEntries', () => {
  it('soma duplicatas na planilha', () => {
    const consolidated = consolidateSnapshotEntries([
      entry('Valepan', 'HB Brioche', { caixas: 10 }),
      entry('Valepan', 'HB Brioche', { caixas: 5 }),
    ]);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].quantidade.caixas).toBe(15);
  });
});

describe('reconcileEstoque', () => {
  it('detecta só na planilha', () => {
    const sheet = buildSnapshotMap([entry('A', 'P1', { caixas: 1 })]);
    const db = buildSnapshotMap([]);
    const diffs = reconcileEstoque(sheet, db);
    expect(diffs).toEqual([
      expect.objectContaining({ kind: 'only_in_sheet', tipoEstoque: 'A', produto: 'P1' }),
    ]);
  });

  it('detecta só no banco', () => {
    const sheet = buildSnapshotMap([]);
    const db = buildSnapshotMap([entry('A', 'P1', { caixas: 2 })]);
    const diffs = reconcileEstoque(sheet, db);
    expect(diffs[0].kind).toBe('only_in_database');
  });

  it('detecta quantidade diferente', () => {
    const sheet = buildSnapshotMap([entry('A', 'P1', { caixas: 10 })]);
    const db = buildSnapshotMap([entry('A', 'P1', { caixas: 9 })]);
    const diffs = reconcileEstoque(sheet, db);
    expect(diffs[0].kind).toBe('quantity_mismatch');
  });

  it('considera kg com 3 casas', () => {
    expect(quantidadesIguais({ caixas: 0, pacotes: 0, unidades: 0, kg: 1.2 }, { caixas: 0, pacotes: 0, unidades: 0, kg: 1.200 })).toBe(true);
  });

  it('sem divergências quando iguais', () => {
    const e = entry('A', 'P1', { caixas: 3, kg: 1.5 });
    const sheet = buildSnapshotMap([e]);
    const db = buildSnapshotMap([e]);
    expect(reconcileEstoque(sheet, db)).toHaveLength(0);
    expect(hasReconcileIssues(buildReconcileResult(sheet, db))).toBe(false);
  });
});
