import { describe, expect, it, vi } from 'vitest';
import { EstimativaRecalcCoordinator } from './estimativa-producao-recalc';

describe('EstimativaRecalcCoordinator', () => {
  it('recalcula uma vez por data ao coalescer várias mutações', async () => {
    const recalc = vi.fn().mockResolvedValue(undefined);
    const coordinator = new EstimativaRecalcCoordinator(recalc);

    await coordinator.runCoalesced(async () => {
      await coordinator.enqueue('2026-08-17');
      await coordinator.enqueue('2026-08-17', '2026-08-18');
    });

    expect(recalc).toHaveBeenCalledTimes(2);
    expect(recalc).toHaveBeenCalledWith('2026-08-17');
    expect(recalc).toHaveBeenCalledWith('2026-08-18');
  });

  it('recalcula imediatamente fora do lote', async () => {
    const recalc = vi.fn().mockResolvedValue(undefined);
    const coordinator = new EstimativaRecalcCoordinator(recalc);

    await coordinator.enqueue('2026-08-17');

    expect(recalc).toHaveBeenCalledTimes(1);
    expect(recalc).toHaveBeenCalledWith('2026-08-17');
  });
});
