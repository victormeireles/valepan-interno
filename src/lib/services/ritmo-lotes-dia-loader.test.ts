import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadRange = vi.fn();

vi.mock('./fluxo-lote-leitura', () => ({
  fluxoLoteLeitura: {
    loadRange: (...args: unknown[]) => loadRange(...args),
  },
}));

const { ritmoLotesDiaLoader } = await import('./ritmo-lotes-dia-loader');

const CIVIL_START = '2026-09-02T00:00:00-03:00';
const CIVIL_END = '2026-09-03T00:00:00-03:00';

describe('RitmoLotesDiaLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadRange.mockResolvedValue({ ferm: [], forno: [], emb: [] });
  });

  it("load('2026-09-02') ainda chama range civil BR", async () => {
    await ritmoLotesDiaLoader.load('2026-09-02');
    expect(loadRange).toHaveBeenCalledWith(CIVIL_START, CIVIL_END);
  });

  it('loadRange usa os ISO passados', async () => {
    const startIso = '2026-09-01T22:00:00-03:00';
    const endIso = '2026-09-02T22:00:00-03:00';

    await ritmoLotesDiaLoader.loadRange(startIso, endIso);
    expect(loadRange).toHaveBeenCalledWith(startIso, endIso);
  });
});
