import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();
const mockListByOrdem = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: { findById: (...args: unknown[]) => mockFindById(...args) },
}));
vi.mock('@/data/producao-etapa/FermentacaoLoteRepository', () => ({
  fermentacaoLoteRepository: {
    listByOrdemProducaoIds: (...args: unknown[]) => mockListByOrdem(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    findById: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
  },
}));

describe('FermentacaoLoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({
      id: 'o1',
      assadeiraId: 'a1',
      assadeiras: 10,
      quantidade: { unidades: 240, caixas: 0, pacotes: 0, kg: 0 },
    });
    mockListByOrdem.mockResolvedValue(new Map([['o1', [{ assadeiras: 8, unidades: 0 }]]]));
    mockInsert.mockResolvedValue({ id: 'l-new' });
  });

  it('rejeita lote acima do saldo', async () => {
    const { fermentacaoLoteService } = await import('./fermentacao-lote-service');
    await expect(
      fermentacaoLoteService.criarLotePorOrdem({
        ordemProducaoId: 'o1',
        quantidade: { assadeiras: 5, unidades: 0 },
      }),
    ).rejects.toThrow(/saldo/i);
  });

  it('cria lote dentro do saldo', async () => {
    const { fermentacaoLoteService } = await import('./fermentacao-lote-service');
    const result = await fermentacaoLoteService.criarLotePorOrdem({
      ordemProducaoId: 'o1',
      quantidade: { assadeiras: 2, unidades: 0 },
    });
    expect(result.id).toBe('l-new');
    expect(mockInsert).toHaveBeenCalled();
  });
});
