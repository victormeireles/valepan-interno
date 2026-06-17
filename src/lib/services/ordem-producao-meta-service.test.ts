import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsertMany = vi.fn();
const nextOrdemPlanejamento = vi.fn();
const findById = vi.fn();
const updatePedidoFields = vi.fn();
const sumQuantidadeByPedidoId = vi.fn();
const resolveIds = vi.fn();
const resolveAssadeiraForProduto = vi.fn();
const hasAssadeiraForProduto = vi.fn();
const resolveBoxUnitsForProduto = vi.fn();
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
    findById: (...args: unknown[]) => findById(...args),
    updateQuantidades: vi.fn(),
    updatePedidoFields: (...args: unknown[]) => updatePedidoFields(...args),
    deleteById: vi.fn(),
  },
}));

vi.mock('@/data/embalagem/EmbalagemLoteRepository', () => ({
  embalagemLoteRepository: {
    sumQuantidadeByPedidoId: (...args: unknown[]) => sumQuantidadeByPedidoId(...args),
  },
}));

vi.mock('@/lib/services/pedido-embalagem-service', () => ({
  pedidoEmbalagemService: {
    resolveIds: (...args: unknown[]) => resolveIds(...args),
    resolveAssadeiraForProduto: (...args: unknown[]) => resolveAssadeiraForProduto(...args),
    hasAssadeiraForProduto: (...args: unknown[]) => hasAssadeiraForProduto(...args),
    resolveBoxUnitsForProduto: (...args: unknown[]) => resolveBoxUnitsForProduto(...args),
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

describe('OrdemProducaoMetaService.updateFromForm', () => {
  const service = new OrdemProducaoMetaService();

  const existingRecord = {
    id: 'op-1',
    dataProducao: '2026-06-09',
    dataFabricacaoEtiqueta: '2026-06-09',
    tipoEstoqueId: 'tipo-1',
    produtoId: 'prod-1',
    observacao: 'obs antiga',
    assadeiraId: 'ass-1',
    assadeiras: 10,
    ordemPlanejamento: 3,
    quantidade: { caixas: 5, pacotes: 0, unidades: 240, kg: 0 },
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue(existingRecord);
    resolveIds.mockResolvedValue({ tipoEstoqueId: 'tipo-2', produtoId: 'prod-2' });
    sumQuantidadeByPedidoId.mockResolvedValue({
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    });
    updatePedidoFields.mockImplementation((_id, fields) =>
      Promise.resolve({ ...existingRecord, ...fields }),
    );
  });

  it('persiste latas com quantidade derivada via updatePedidoFields', async () => {
    resolveAssadeiraForProduto.mockResolvedValue({
      assadeiraId: 'ass-2',
      unidadesPorAssadeiraEfetiva: 24,
      boxUnits: 48,
    });

    await service.updateFromForm('op-1', {
      dataProducao: '2026-06-10',
      dataEtiqueta: '2026-06-10',
      tipoEstoque: 'Valepan',
      produto: 'HB Brioche 65g',
      observacao: 'nova obs',
      modoQuantidade: 'latas',
      latas: 12,
      assadeiraNome: 'Grande',
    });

    expect(resolveAssadeiraForProduto).toHaveBeenCalledWith('prod-2', 'Grande');
    expect(updatePedidoFields).toHaveBeenCalledWith('op-1', {
      dataProducao: '2026-06-10',
      dataFabricacaoEtiqueta: '2026-06-10',
      tipoEstoqueId: 'tipo-2',
      produtoId: 'prod-2',
      observacao: 'nova obs',
      assadeiraId: 'ass-2',
      assadeiras: 12,
      ordemPlanejamento: 3,
      quantidade: { unidades: 288, caixas: 6, pacotes: 0, kg: 0 },
    });
  });

  it('persiste unidades sem assadeira via updatePedidoFields', async () => {
    hasAssadeiraForProduto.mockResolvedValue(false);
    resolveBoxUnitsForProduto.mockResolvedValue(24);

    await service.updateFromForm('op-1', {
      dataProducao: '2026-06-10',
      dataEtiqueta: '2026-06-10',
      tipoEstoque: 'Valepan',
      produto: 'Produto sem assadeira',
      observacao: 'nova obs',
      modoQuantidade: 'unidades',
      unidades: 500,
    });

    expect(hasAssadeiraForProduto).toHaveBeenCalledWith('prod-2');
    expect(updatePedidoFields).toHaveBeenCalledWith('op-1', {
      dataProducao: '2026-06-10',
      dataFabricacaoEtiqueta: '2026-06-10',
      tipoEstoqueId: 'tipo-2',
      produtoId: 'prod-2',
      observacao: 'nova obs',
      assadeiraId: '',
      assadeiras: 0,
      ordemPlanejamento: 3,
      quantidade: { unidades: 500, caixas: 20, pacotes: 0, kg: 0 },
    });
  });

  it('rejeita modo unidades para produto com assadeira', async () => {
    hasAssadeiraForProduto.mockResolvedValue(true);

    await expect(
      service.updateFromForm('op-1', {
        dataProducao: '2026-06-10',
        dataEtiqueta: '2026-06-10',
        tipoEstoque: 'Valepan',
        produto: 'HB Brioche 65g',
        observacao: '',
        modoQuantidade: 'unidades',
        unidades: 100,
      }),
    ).rejects.toThrow(/possui assadeira/);

    expect(updatePedidoFields).not.toHaveBeenCalled();
  });
});
