import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindLoteById = vi.fn();
const mockUpdateLoteById = vi.fn();
const mockFindTipoById = vi.fn();
const mockFindProdutoById = vi.fn();
const mockAplicarDelta = vi.fn();

vi.mock('@/data/embalagem/EmbalagemLoteRepository', () => ({
  embalagemLoteRepository: {
    findById: (...args: unknown[]) => mockFindLoteById(...args),
    updateById: (...args: unknown[]) => mockUpdateLoteById(...args),
    insert: vi.fn(),
    deleteById: vi.fn(),
  },
}));

vi.mock('@/data/estoque/EstoqueRepository', () => ({
  estoqueRepository: {
    clearEmbalagemLoteId: vi.fn(),
  },
}));

vi.mock('@/data/embalagem/PedidoEmbalagemRepository', () => ({
  pedidoEmbalagemRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('@/lib/services/products/supabase-product-service', () => ({
  SupabaseProductService: class {
    findById(...args: unknown[]) {
      return mockFindProdutoById(...args);
    }
  },
}));

vi.mock('@/lib/services/tipos-estoque-service', () => ({
  tiposEstoqueService: {
    findById: (...args: unknown[]) => mockFindTipoById(...args),
  },
}));

vi.mock('@/lib/services/estoque-service', () => ({
  estoqueService: {
    obterTipoEstoqueCliente: vi.fn(async () => null),
    aplicarDelta: (...args: unknown[]) => mockAplicarDelta(...args),
  },
}));

vi.mock('@/lib/services/estoque-resolver-service', () => ({
  EstoqueResolverError: class EstoqueResolverError extends Error {},
}));

vi.mock('@/lib/services/saida-movimento-service', () => ({
  saidaMovimentoService: {
    registrarSaida: vi.fn(),
  },
}));

describe('EmbalagemLoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindLoteById.mockResolvedValue({
      id: 'lote-1',
      tipoEstoqueId: 'tipo-1',
      produtoId: 'produto-1',
      quantidade: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
      fotos: {},
      obsEmbalagem: null,
    });
    mockFindTipoById.mockResolvedValue({ id: 'tipo-1', nome: 'Cliente' });
    mockFindProdutoById.mockResolvedValue({ id: 'produto-1', nome: 'Produto' });
    mockUpdateLoteById.mockResolvedValue({ id: 'lote-1' });
  });

  it('rejeita atualização com todas as quantidades zeradas', async () => {
    const { embalagemLoteService } = await import('./embalagem-lote-service');

    await expect(
      embalagemLoteService.atualizarLote('lote-1', {
        quantidade: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
      }),
    ).rejects.toThrow(/quantidade maior que zero/i);

    expect(mockUpdateLoteById).not.toHaveBeenCalled();
    expect(mockAplicarDelta).not.toHaveBeenCalled();
  });
});
