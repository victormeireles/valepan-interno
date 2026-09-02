import { beforeEach, describe, expect, it, vi } from 'vitest';

const listFerm = vi.fn();
const listForno = vi.fn();
const listEmb = vi.fn();

vi.mock('@/data/producao-etapa/FermentacaoLoteRepository', () => ({
  fermentacaoLoteRepository: {
    listByProduzidoEmRange: (...args: unknown[]) => listFerm(...args),
  },
}));

vi.mock('@/data/producao-etapa/FornoLoteRepository', () => ({
  fornoLoteRepository: {
    listByProduzidoEmRange: (...args: unknown[]) => listForno(...args),
  },
}));

vi.mock('@/data/embalagem/EmbalagemLoteRepository', () => ({
  embalagemLoteRepository: {
    listByProduzidoEmRange: (...args: unknown[]) => listEmb(...args),
  },
}));

const { ritmoLotesDiaLoader } = await import('./ritmo-lotes-dia-loader');

const CIVIL_START = '2026-09-02T00:00:00-03:00';
const CIVIL_END = '2026-09-03T00:00:00-03:00';

describe('RitmoLotesDiaLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFerm.mockResolvedValue([]);
    listForno.mockResolvedValue([]);
    listEmb.mockResolvedValue([]);
  });

  it("load('2026-09-02') ainda chama range civil BR", async () => {
    await ritmoLotesDiaLoader.load('2026-09-02');

    expect(listFerm).toHaveBeenCalledWith(CIVIL_START, CIVIL_END);
    expect(listForno).toHaveBeenCalledWith(CIVIL_START, CIVIL_END);
    expect(listEmb).toHaveBeenCalledWith(CIVIL_START, CIVIL_END);
  });

  it('loadRange usa os ISO passados', async () => {
    const startIso = '2026-09-01T22:00:00-03:00';
    const endIso = '2026-09-02T22:00:00-03:00';

    await ritmoLotesDiaLoader.loadRange(startIso, endIso);

    expect(listFerm).toHaveBeenCalledWith(startIso, endIso);
    expect(listForno).toHaveBeenCalledWith(startIso, endIso);
    expect(listEmb).toHaveBeenCalledWith(startIso, endIso);
  });
});
