import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = {
  findSaldo: vi.fn(),
  upsertSaldo: vi.fn(),
  insertMovimento: vi.fn(),
  findInsumoCustoUnitario: vi.fn(),
  movimentoEntradaJaExiste: vi.fn(),
  updateInsumoCustoUnitario: vi.fn(),
};

const abaterPorEntradaNf = vi.fn();

vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: {},
  InsumoEstoqueRepository: vi.fn(),
}));

vi.mock('@/lib/services/insumo-pedido-compra-manager', () => ({
  insumoPedidoCompraManager: { abaterPorEntradaNf: vi.fn() },
}));

const entradaNfInput = {
  insumoId: 'insumo-1',
  empresaId: 'emp-1',
  quantidadeEntrada: 48,
  custoUnitario: 36.99,
  origem: 'entrada_nf' as const,
  omieNIdReceb: 1,
  omieNIdItem: 2,
};

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

describe('InsumoEstoqueService.registrarEntrada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.movimentoEntradaJaExiste.mockResolvedValue(false);
    mockRepo.findSaldo.mockResolvedValue({ quantidade: 10 });
    mockRepo.upsertSaldo.mockResolvedValue({});
    mockRepo.insertMovimento.mockResolvedValue({ id: 'mov-1' });
    mockRepo.updateInsumoCustoUnitario.mockResolvedValue(undefined);
    abaterPorEntradaNf.mockResolvedValue('pedido-1');
  });

  it('retorna false e não abate se movimento já existe', async () => {
    mockRepo.movimentoEntradaJaExiste.mockResolvedValue(true);
    const { InsumoEstoqueService } = await import('./insumo-estoque-service');
    const service = new InsumoEstoqueService(mockRepo as never, { abaterPorEntradaNf });

    const criada = await service.registrarEntrada(entradaNfInput);

    expect(criada).toBe(false);
    expect(abaterPorEntradaNf).not.toHaveBeenCalled();
    expect(mockRepo.insertMovimento).not.toHaveBeenCalled();
  });

  it('retorna true, persiste e abate pedido no insumo', async () => {
    const { InsumoEstoqueService } = await import('./insumo-estoque-service');
    const service = new InsumoEstoqueService(mockRepo as never, { abaterPorEntradaNf });

    const criada = await service.registrarEntrada(entradaNfInput);

    expect(criada).toBe(true);
    expect(mockRepo.insertMovimento).toHaveBeenCalled();
    expect(mockRepo.updateInsumoCustoUnitario).toHaveBeenCalledWith('insumo-1', 36.99);
    expect(abaterPorEntradaNf).toHaveBeenCalledWith('insumo-1');
  });

  it('resolucao_pendencia também abate quando cria', async () => {
    const { InsumoEstoqueService } = await import('./insumo-estoque-service');
    const service = new InsumoEstoqueService(mockRepo as never, { abaterPorEntradaNf });

    const criada = await service.registrarEntrada({
      ...entradaNfInput,
      origem: 'resolucao_pendencia',
      pendenciaId: 'pend-1',
    });

    expect(criada).toBe(true);
    expect(mockRepo.movimentoEntradaJaExiste).not.toHaveBeenCalled();
    expect(abaterPorEntradaNf).toHaveBeenCalledWith('insumo-1');
  });

  it('unique violation → false, sem abater', async () => {
    mockRepo.insertMovimento.mockRejectedValue({ message: 'duplicate key', code: '23505' });
    const { InsumoEstoqueService } = await import('./insumo-estoque-service');
    const service = new InsumoEstoqueService(mockRepo as never, { abaterPorEntradaNf });

    const criada = await service.registrarEntrada(entradaNfInput);

    expect(criada).toBe(false);
    expect(abaterPorEntradaNf).not.toHaveBeenCalled();
    expect(mockRepo.updateInsumoCustoUnitario).not.toHaveBeenCalled();
  });

  it('abater throws → ainda retorna true e loga erro', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    abaterPorEntradaNf.mockRejectedValue(new Error('falha no abatimento'));
    const { InsumoEstoqueService } = await import('./insumo-estoque-service');
    const service = new InsumoEstoqueService(mockRepo as never, { abaterPorEntradaNf });

    const criada = await service.registrarEntrada(entradaNfInput);

    expect(criada).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      'Falha ao abater pedido após entrada NF:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
