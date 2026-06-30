import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = {
  findSaldo: vi.fn(),
  upsertSaldo: vi.fn(),
  insertMovimento: vi.fn(),
  findInsumoCustoUnitario: vi.fn(),
};

vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: {},
  InsumoEstoqueRepository: vi.fn(),
}));

describe('InsumoEstoqueService.aplicarDelta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.findSaldo.mockResolvedValue({ quantidade: 5 });
    mockRepo.findInsumoCustoUnitario.mockResolvedValue(2.5);
    mockRepo.upsertSaldo.mockResolvedValue({});
    mockRepo.insertMovimento.mockResolvedValue({ id: 'mov-1' });
  });

  it('permite saldo negativo', async () => {
    const { InsumoEstoqueService } = await import('./insumo-estoque-service');
    const service = new InsumoEstoqueService(mockRepo as never);

    await service.aplicarDelta({
      insumoId: 'ins-1',
      delta: -8,
      origem: 'producao_fermentacao',
      fermentacaoLoteId: 'lote-1',
      observacao: 'teste',
    });

    expect(mockRepo.upsertSaldo).toHaveBeenCalledWith('ins-1', -3);
    expect(mockRepo.insertMovimento).toHaveBeenCalledWith(
      expect.objectContaining({
        insumoId: 'ins-1',
        deltaQuantidade: -8,
        saldoResultante: -3,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: 'lote-1',
      }),
    );
  });
});
