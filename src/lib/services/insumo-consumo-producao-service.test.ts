import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

const mockReceitaRepo = { loadContexto: vi.fn() };
const mockAplicador = { reconciliar: vi.fn(), estornar: vi.fn() };

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
  quantidade: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
  createdAt: '',
  updatedAt: '',
} as unknown as OrdemProducaoRecord;

const lote: FermentacaoLoteRecord = {
  id: 'lote-1',
  ordemProducaoId: 'ordem-1',
  modo: 'parcial',
  assadeiras: 1,
  unidades: 0,
  produzidoEm: '2026-06-30T10:00:00Z',
  createdAt: '2026-06-30T10:00:00Z',
};

vi.mock('@/data/insumos/InsumoReceitaMassaRepository', () => ({
  insumoReceitaMassaRepository: mockReceitaRepo,
}));
vi.mock('@/lib/services/insumo-consumo-aplicador', () => ({
  insumoConsumoAplicador: mockAplicador,
}));

describe('InsumoConsumoProducaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAplicador.reconciliar.mockResolvedValue(undefined);
    mockAplicador.estornar.mockResolvedValue(true);
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
      mockAplicador as never,
    );

    const result = await service.sincronizarFermentacaoLote(lote, ordem);
    expect(result.aplicado).toBe(true);
    expect(mockAplicador.reconciliar).toHaveBeenCalledWith(
      expect.objectContaining({
        vinculo: { coluna: 'fermentacao_lote_id', loteId: 'lote-1' },
        origem: 'producao_fermentacao',
        consumosAlvo: [{ insumoId: 'farinha', quantidade: 3 }],
      }),
    );
  });

  it('retorna aviso sem receita', async () => {
    mockReceitaRepo.loadContexto.mockResolvedValue(null);

    const { InsumoConsumoProducaoService } = await import('./insumo-consumo-producao-service');
    const service = new InsumoConsumoProducaoService(
      mockReceitaRepo as never,
      mockAplicador as never,
    );

    const result = await service.sincronizarFermentacaoLote(lote, ordem);
    expect(result.aplicado).toBe(false);
    expect(result.avisos[0]).toContain('sem receita de massa');
    expect(mockAplicador.reconciliar).not.toHaveBeenCalled();
  });

  it('estorna movimentos ao excluir lote', async () => {
    const { InsumoConsumoProducaoService } = await import('./insumo-consumo-producao-service');
    const service = new InsumoConsumoProducaoService(
      mockReceitaRepo as never,
      mockAplicador as never,
    );

    const result = await service.estornarFermentacaoLote(lote);
    expect(result.aplicado).toBe(true);
    expect(mockAplicador.estornar).toHaveBeenCalledWith(
      expect.objectContaining({
        vinculo: { coluna: 'fermentacao_lote_id', loteId: 'lote-1' },
        origem: 'producao_fermentacao',
      }),
    );
  });
});
