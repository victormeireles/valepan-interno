import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

const mockReceitaRepo = { loadContexto: vi.fn() };
const mockEstoqueRepo = {
  sumDeltaByFermentacaoLoteInsumo: vi.fn(),
  clearFermentacaoLoteId: vi.fn(),
};
const mockEstoqueService = { aplicarDelta: vi.fn() };

const ordem: OrdemProducaoRecord = {
  id: 'ordem-1',
  produtoId: 'prod-1',
  assadeiraId: 'ass-1',
  dataProducao: '2026-06-30',
  dataFabricacaoEtiqueta: '2026-06-30',
  tipoEstoqueId: 'tipo-1',
  observacao: '',
  assadeiras: 10,
  ordemPlanejamento: 1,
  quantidade: { unidades: 0, kg: 0 },
  createdAt: '',
  updatedAt: '',
  fermentacaoFinalizada: false,
  fornoFinalizado: false,
  embalagemFinalizada: false,
};

const lote: FermentacaoLoteRecord = {
  id: 'lote-1',
  ordemProducaoId: 'ordem-1',
  modo: 'parcial',
  assadeiras: 1,
  unidades: 0,
  produzidoEm: '2026-06-30T10:00:00Z',
};

vi.mock('@/data/insumos/InsumoReceitaMassaRepository', () => ({
  insumoReceitaMassaRepository: mockReceitaRepo,
}));
vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: mockEstoqueRepo,
}));
vi.mock('@/lib/services/insumo-estoque-service', () => ({
  insumoEstoqueService: mockEstoqueService,
}));

describe('InsumoConsumoProducaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEstoqueRepo.sumDeltaByFermentacaoLoteInsumo.mockResolvedValue(new Map());
    mockEstoqueRepo.clearFermentacaoLoteId.mockResolvedValue(undefined);
    mockEstoqueService.aplicarDelta.mockResolvedValue(undefined);
  });

  it('sincroniza consumo quando receita existe', async () => {
    mockReceitaRepo.loadContexto.mockResolvedValue({
      produtoNome: 'HB 65g',
      quantidadePorProduto: 100,
      unidadesPorAssadeira: 30,
      ingredientes: [{ insumoId: 'farinha', quantidadePadrao: 10 }],
    });

    const { InsumoConsumoProducaoService } = await import('./insumo-consumo-producao-service');
    const service = new InsumoConsumoProducaoService(
      mockReceitaRepo as never,
      mockEstoqueRepo as never,
      mockEstoqueService as never,
    );

    const result = await service.sincronizarFermentacaoLote(lote, ordem);
    expect(result.aplicado).toBe(true);
    expect(mockEstoqueService.aplicarDelta).toHaveBeenCalledWith(
      expect.objectContaining({
        insumoId: 'farinha',
        delta: -3,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: 'lote-1',
      }),
    );
  });

  it('retorna aviso sem receita', async () => {
    mockReceitaRepo.loadContexto.mockResolvedValue(null);

    const { InsumoConsumoProducaoService } = await import('./insumo-consumo-producao-service');
    const service = new InsumoConsumoProducaoService(
      mockReceitaRepo as never,
      mockEstoqueRepo as never,
      mockEstoqueService as never,
    );

    const result = await service.sincronizarFermentacaoLote(lote, ordem);
    expect(result.aplicado).toBe(false);
    expect(result.avisos[0]).toContain('sem receita de massa');
    expect(mockEstoqueService.aplicarDelta).not.toHaveBeenCalled();
  });

  it('estorna movimentos ao excluir lote', async () => {
    mockEstoqueRepo.sumDeltaByFermentacaoLoteInsumo.mockResolvedValue(
      new Map([['farinha', -3]]),
    );
    mockReceitaRepo.loadContexto.mockResolvedValue({
      produtoNome: 'HB 65g',
      quantidadePorProduto: 100,
      unidadesPorAssadeira: 30,
      ingredientes: [],
    });

    const { InsumoConsumoProducaoService } = await import('./insumo-consumo-producao-service');
    const service = new InsumoConsumoProducaoService(
      mockReceitaRepo as never,
      mockEstoqueRepo as never,
      mockEstoqueService as never,
    );

    const result = await service.estornarFermentacaoLote(lote, ordem);
    expect(result.aplicado).toBe(true);
    expect(mockEstoqueService.aplicarDelta).toHaveBeenCalledWith(
      expect.objectContaining({ insumoId: 'farinha', delta: 3 }),
    );
    expect(mockEstoqueRepo.clearFermentacaoLoteId).toHaveBeenCalledWith('lote-1');
  });
});
