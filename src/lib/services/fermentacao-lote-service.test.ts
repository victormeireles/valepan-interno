import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();
const mockListByOrdem = vi.fn();
const mockInsert = vi.fn();
const mockFindLoteById = vi.fn();
const mockUpdateById = vi.fn();

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: { findById: (...args: unknown[]) => mockFindById(...args) },
}));
vi.mock('@/data/producao-etapa/FermentacaoLoteRepository', () => ({
  fermentacaoLoteRepository: {
    listByOrdemProducaoIds: (...args: unknown[]) => mockListByOrdem(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    findById: (...args: unknown[]) => mockFindLoteById(...args),
    updateById: (...args: unknown[]) => mockUpdateById(...args),
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
    mockListByOrdem.mockResolvedValue(new Map([['o1', [{ id: 'l2', assadeiras: 8, unidades: 0 }]]]));
    mockInsert.mockResolvedValue({ id: 'l-new' });
    mockFindLoteById.mockResolvedValue({
      id: 'l1',
      ordemProducaoId: 'o1',
      assadeiras: 2,
      unidades: 0,
      fotos: {},
    });
    mockUpdateById.mockResolvedValue({ id: 'l1', assadeiras: 5, unidades: 0 });
  });

  it('cria lote acima do saldo da ordem', async () => {
    const { fermentacaoLoteService } = await import('./fermentacao-lote-service');
    const result = await fermentacaoLoteService.criarLotePorOrdem({
      ordemProducaoId: 'o1',
      quantidade: { assadeiras: 5, unidades: 0 },
    });

    expect(result.id).toBe('l-new');
    expect(mockInsert).toHaveBeenCalled();
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

  it('atualiza lote mesmo quando o total passa da ordem', async () => {
    const { fermentacaoLoteService } = await import('./fermentacao-lote-service');
    const result = await fermentacaoLoteService.atualizarLote('l1', {
      quantidade: { assadeiras: 5, unidades: 0 },
    });

    expect(result.id).toBe('l1');
    expect(mockUpdateById).toHaveBeenCalled();
  });
});
