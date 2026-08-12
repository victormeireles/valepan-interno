import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireInternoModuloMock = vi.fn();
const buildPageDataMock = vi.fn();

vi.mock('@/lib/auth/require-interno-modulo', () => ({
  requireInternoModulo: requireInternoModuloMock,
}));
vi.mock('@/lib/services/insumo-compra-sugestao-service', () => ({
  insumoCompraSugestaoService: {
    buildPageData: buildPageDataMock,
  },
}));

describe('getInsumoCompraSugestaoPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternoModuloMock.mockResolvedValue(undefined);
    buildPageDataMock.mockResolvedValue({ dataReferencia: '2026-08-12' });
  });

  it('exige leitura de insumos antes de montar os dados', async () => {
    const { getInsumoCompraSugestaoPageData } = await import(
      './insumo-compra-sugestao-actions'
    );

    const result = await getInsumoCompraSugestaoPageData('2026-08-12');

    expect(requireInternoModuloMock).toHaveBeenCalledWith('interno_insumos', 'ler');
    expect(buildPageDataMock).toHaveBeenCalledWith('2026-08-12');
    expect(requireInternoModuloMock.mock.invocationCallOrder[0]).toBeLessThan(
      buildPageDataMock.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({ dataReferencia: '2026-08-12' });
  });
});
