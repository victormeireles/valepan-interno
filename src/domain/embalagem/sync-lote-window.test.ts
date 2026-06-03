import { describe, expect, it } from 'vitest';
import { parseSyncLoteArgs, isDataPedidoInWindow } from './sync-lote-window';

describe('parseSyncLoteArgs', () => {
  it('default days=7', () => {
    const r = parseSyncLoteArgs([]);
    expect(r.days).toBe(7);
    expect(r.since).toBeUndefined();
    expect(r.dryRun).toBe(false);
    expect(r.force).toBe(false);
  });

  it('parses --since and --dry-run', () => {
    const r = parseSyncLoteArgs(['--since=2026-05-01', '--dry-run', '--force']);
    expect(r.since).toBe('2026-05-01');
    expect(r.dryRun).toBe(true);
    expect(r.force).toBe(true);
  });
});

describe('isDataPedidoInWindow', () => {
  it('includes date on since boundary', () => {
    expect(isDataPedidoInWindow('2026-06-01', { since: '2026-06-01' })).toBe(true);
  });

  it('excludes date before since', () => {
    expect(isDataPedidoInWindow('2026-05-31', { since: '2026-06-01' })).toBe(false);
  });
});
