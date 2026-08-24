import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/insumos/InsumoConsumoProdutividadeLoteRepository', () => ({
  insumoConsumoProdutividadeLoteRepository: {},
}));
vi.mock('@/data/insumos/InsumoReceitaMassaRepository', () => ({
  insumoReceitaMassaRepository: {},
}));
vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: {},
}));
vi.mock('@/lib/services/insumo-estoque-service', () => ({
  insumoEstoqueService: {},
}));
vi.mock('@/data/insumos/TipoEstoqueReceitaCaixaRepository', () => ({
  tipoEstoqueReceitaCaixaRepository: {},
}));

const mockLoteRepo = {
  listLoteIdsByProduto: vi.fn(),
  loadEmbalagemLotes: vi.fn(),
};
const mockReceitaRepo = { loadContextoProducaoPorProduto: vi.fn() };
const mockEstoqueRepo = { sumDeltasGroupedByLoteInsumo: vi.fn() };
const mockEstoqueService = { aplicarDeltasEmLote: vi.fn() };
const mockExcecaoRepo = { loadIngredientes: vi.fn() };

const contexto = {
  produtoNome: 'HB 65g',
  unidadesPorAssadeira: null,
  receitas: [
    {
      tipo: 'caixa' as const,
      quantidadePorProduto: 48,
      ingredientes: [{ insumoId: 'caixa-valepan', quantidadePadrao: 1 }],
    },
  ],
};

function lote(id: string, tipoEstoqueId: string) {
  return {
    id,
    createdAt: '2026-08-24T10:00:00Z',
    modo: 'parcial' as const,
    dataPedido: '2026-08-24',
    dataFabricacao: '2026-08-24',
    tipoEstoqueId,
    produtoId: 'prod-1',
    congelado: 'Não' as const,
    quantidade: { caixas: 1, pacotes: 0, unidades: 0, kg: 0 },
    produzidoEm: '2026-08-24T10:00:00Z',
  };
}

describe('InsumoConsumoEmbalagemBackfillBatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReceitaRepo.loadContextoProducaoPorProduto.mockResolvedValue(contexto);
    mockLoteRepo.listLoteIdsByProduto.mockResolvedValue([
      { id: 'lote-v', produzidoEm: '2026-08-24T10:00:00Z' },
      { id: 'lote-d', produzidoEm: '2026-08-24T11:00:00Z' },
    ]);
    mockLoteRepo.loadEmbalagemLotes.mockResolvedValue([
      lote('lote-v', 'tipo-valepan'),
      lote('lote-d', 'tipo-damiao'),
    ]);
    mockEstoqueRepo.sumDeltasGroupedByLoteInsumo.mockResolvedValue(new Map());
    mockEstoqueService.aplicarDeltasEmLote.mockResolvedValue(2);
    mockExcecaoRepo.loadIngredientes.mockImplementation(async (tipoId: string) => {
      if (tipoId === 'tipo-damiao') {
        return [{ insumoId: 'caixa-damiao', quantidadePadrao: 1 }];
      }
      return null;
    });
  });

  it('mesmo produto: Valepan e Damião geram insumos de caixa diferentes', async () => {
    const { InsumoConsumoEmbalagemBackfillBatchService } = await import(
      './insumo-consumo-embalagem-backfill-batch-service'
    );
    const service = new InsumoConsumoEmbalagemBackfillBatchService(
      mockLoteRepo as never,
      mockReceitaRepo as never,
      mockEstoqueRepo as never,
      mockEstoqueService as never,
      mockExcecaoRepo as never,
    );
    await service.applyPorProdutos([{ produtoId: 'prod-1', produtoNome: 'HB 65g' }]);
    const pendentes = mockEstoqueService.aplicarDeltasEmLote.mock.calls[0][0] as Array<{
      insumoId: string;
      embalagemLoteId: string;
    }>;
    expect(pendentes.find((p) => p.embalagemLoteId === 'lote-v')?.insumoId).toBe(
      'caixa-valepan',
    );
    expect(pendentes.find((p) => p.embalagemLoteId === 'lote-d')?.insumoId).toBe(
      'caixa-damiao',
    );
  });

  it('restringe lotes quando tipoEstoqueId é informado', async () => {
    const { InsumoConsumoEmbalagemBackfillBatchService } = await import(
      './insumo-consumo-embalagem-backfill-batch-service'
    );
    const service = new InsumoConsumoEmbalagemBackfillBatchService(
      mockLoteRepo as never,
      mockReceitaRepo as never,
      mockEstoqueRepo as never,
      mockEstoqueService as never,
      mockExcecaoRepo as never,
    );
    mockLoteRepo.listLoteIdsByProduto.mockResolvedValue([
      { id: 'lote-d', produzidoEm: '2026-08-24T11:00:00Z' },
    ]);
    mockLoteRepo.loadEmbalagemLotes.mockResolvedValue([lote('lote-d', 'tipo-damiao')]);
    mockEstoqueService.aplicarDeltasEmLote.mockResolvedValue(1);

    await service.applyPorProdutos(
      [{ produtoId: 'prod-1', produtoNome: 'HB 65g' }],
      null,
      'tipo-damiao',
    );

    expect(mockLoteRepo.listLoteIdsByProduto).toHaveBeenCalledWith({
      produtoId: 'prod-1',
      coluna: 'embalagem_lote_id',
      desdeIso: null,
      tipoEstoqueId: 'tipo-damiao',
    });
  });
});
