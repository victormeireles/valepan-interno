import { describe, expect, it } from 'vitest';
import {
  enumerateDatesInclusive,
  isDataProducaoInWindow,
  resolvePedidoSyncWindow,
  resolvePedidoSyncWindowForApi,
} from './sync-pedido-window';

describe('resolvePedidoSyncWindow', () => {
  it('defaults to today ± 3', () => {
    const w = resolvePedidoSyncWindow({}, '2026-06-03');
    expect(w).toEqual({ from: '2026-05-31', to: '2026-06-06' });
  });

  it('respects overrides', () => {
    const w = resolvePedidoSyncWindow(
      { dryRun: false, from: '2026-06-01', until: '2026-06-02' },
      '2026-06-03',
    );
    expect(w.from).toBe('2026-06-01');
    expect(w.to).toBe('2026-06-02');
  });
});

describe('resolvePedidoSyncWindowForApi', () => {
  it('defaults to today through tomorrow', () => {
    const w = resolvePedidoSyncWindowForApi({}, '2026-06-03');
    expect(w).toEqual({ from: '2026-06-03', to: '2026-06-04' });
  });

  it('respects overrides', () => {
    const w = resolvePedidoSyncWindowForApi(
      { from: '2026-06-01', until: '2026-06-02' },
      '2026-06-03',
    );
    expect(w.from).toBe('2026-06-01');
    expect(w.to).toBe('2026-06-02');
  });
});

describe('isDataProducaoInWindow', () => {
  it('inclusive boundaries', () => {
    const w = { from: '2026-06-01', to: '2026-06-03' };
    expect(isDataProducaoInWindow('2026-06-01', w)).toBe(true);
    expect(isDataProducaoInWindow('2026-06-03', w)).toBe(true);
    expect(isDataProducaoInWindow('2026-05-31', w)).toBe(false);
  });
});

describe('enumerateDatesInclusive', () => {
  it('lists each day', () => {
    expect(enumerateDatesInclusive('2026-06-01', '2026-06-03')).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });
});
