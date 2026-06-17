import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsertMany = vi.fn();
const nextOrdemPlanejamento = vi.fn();
const resolveIds = vi.fn();
const resolveAssadeiraForProduto = vi.fn();
const validatePayloadItems = vi.fn();

vi.mock('@/lib/services/estoque-resolver-service', () => ({
  estoqueResolverService: {
    resolveTipoEstoqueFromCliente: vi.fn(),
    resolveProdutoId: vi.fn(),
  },
}));

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: {
    upsertMany: (...args: unknown[]) => upsertMany(...args),
    nextOrdemPlanejamento: (...args: unknown[]) => nextOrdemPlanejamento(...args),
    findById: vi.fn(),
    updateQuantidades: vi.fn(),
    updatePedidoFields: vi.fn(),
    deleteById: vi.fn(),
  },
}));

vi.mock('@/data/embalagem/EmbalagemLoteRepository', () => ({
  embalagemLoteRepository: {
    sumQuantidadeByPedidoId: vi.fn(),
  },
}));

vi.mock('@/lib/services/pedido-embalagem-service', () => ({
  pedidoEmbalagemService: {
    resolveIds: (...args: unknown[]) => resolveIds(...args),
    resolveAssadeiraForProduto: (...args: unknown[]) => resolveAssadeiraForProduto(...args),
    validatePayloadItems: (...args: unknown[]) => validatePayloadItems(...args),
  },
  EstoqueResolverError: class EstoqueResolverError extends Error {},
}));

const { OrdemProducaoMetaService } = await import('./ordem-producao-meta-service');

describe('OrdemProducaoMetaService.createFromLatas', () => {
  const service = new OrdemProducaoMetaService();

  beforeEach(() => {
    vi.clearAllMocks();
    resolveIds.mockResolvedValue({ tipoEstoqueId: 'tipo-1', produtoId: 'prod-1' });
    resolveAssadeiraForProduto.mockResolvedValue({
      assadeiraId: 'ass-1',
      unidadesPorAssadeiraEfetiva: 24,
      boxUnits: 48,
    });
    validatePayloadItems.mockResolvedValue(undefined);
    nextOrdemPlanejamento.mockResolvedValue(1);
    upsertMany.mockResolvedValue([
      {
        id: 'op-1',
        dataProducao: '2026-06-09',
        dataFabricacaoEtiqueta: '2026-06-09',
        tipoEstoqueId: 'tipo-1',
        produtoId: 'prod-1',
        observacao: '',
        assadeiraId: 'ass-1',
        assadeiras: 430,
        ordemPlanejamento: 1,
        quantidade: { caixas: 215, pacotes: 0, unidades: 10320, kg: 0 },
        createdAt: '',
        updatedAt: '',
      },
    ]);
  });

  it('persiste assadeiras e quantidade derivada', async () => {
    const result = await service.createFromLatas({
      dataProducao: '2026-06-09',
      dataEtiqueta: '2026-06-09',
      tipoEstoque: 'Valepan',
      produto: 'HB Brioche 65g',
      latas: 430,
      observacao: '',
    });

    expect(upsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        assadeiras: 430,
        quantidade: expect.objectContaining({
          caixas: 215,
          unidades: 10320,
        }),
      }),
    ]);
    expect(result.id).toBe('op-1');
    expect(validatePayloadItems).toHaveBeenCalledWith('Valepan', ['HB Brioche 65g']);
  });
});
