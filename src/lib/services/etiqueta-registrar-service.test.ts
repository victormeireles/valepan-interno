import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/data/etiquetas/EtiquetasGeradasRepository', () => ({
  etiquetasGeradasRepository: {},
}));

const { EtiquetaRegistrarService } = await import('./etiqueta-registrar-service');

const findByOrdemProducaoIds = vi.fn();
const insert = vi.fn();

describe('EtiquetaRegistrarService.registrar', () => {
  const service = new EtiquetaRegistrarService({
    findByOrdemProducaoIds,
    insert,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    findByOrdemProducaoIds.mockResolvedValue(new Map());
    insert.mockResolvedValue(undefined);
  });

  it('insere registro em modo pedido quando ainda não existe', async () => {
    await service.registrar({
      ordemProducaoId: 'ped-1',
      produtoId: 'prod-1',
      tipoEstoqueId: 'tipo-1',
      dataFabricacao: '2026-06-11',
      modo: 'pedido',
    });

    expect(insert).toHaveBeenCalledWith({
      ordemProducaoId: 'ped-1',
      produtoId: 'prod-1',
      tipoEstoqueId: 'tipo-1',
      dataFabricacao: '2026-06-11',
      modo: 'pedido',
      geradoPor: null,
    });
  });

  it('é idempotente em modo pedido quando já existe', async () => {
    findByOrdemProducaoIds.mockResolvedValue(
      new Map([
        [
          'ped-1',
          {
            id: 'eg-1',
            ordemProducaoId: 'ped-1',
            produtoId: 'prod-1',
            tipoEstoqueId: 'tipo-1',
            dataFabricacao: '2026-06-11',
            modo: 'pedido' as const,
            geradoEm: '2026-06-11T10:00:00Z',
          },
        ],
      ]),
    );

    await service.registrar({
      ordemProducaoId: 'ped-1',
      produtoId: 'prod-1',
      tipoEstoqueId: 'tipo-1',
      dataFabricacao: '2026-06-11',
      modo: 'pedido',
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it('sempre insere em modo manual', async () => {
    await service.registrar({
      produtoId: 'prod-1',
      tipoEstoqueId: 'tipo-1',
      dataFabricacao: '2026-06-11',
      modo: 'manual',
    });

    expect(findByOrdemProducaoIds).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith({
      ordemProducaoId: null,
      produtoId: 'prod-1',
      tipoEstoqueId: 'tipo-1',
      dataFabricacao: '2026-06-11',
      modo: 'manual',
      geradoPor: null,
    });
  });
});
