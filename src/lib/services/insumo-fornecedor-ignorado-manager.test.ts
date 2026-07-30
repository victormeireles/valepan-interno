import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/insumos/InsumoFornecedorIgnoradoRepository', () => ({
  insumoFornecedorIgnoradoRepository: {},
  InsumoFornecedorIgnoradoRepository: class {},
}));
vi.mock('@/data/insumos/InsumoPendenciaRepository', () => ({
  insumoPendenciaRepository: {},
  InsumoPendenciaRepository: class {},
}));

import { InsumoFornecedorIgnoradoManager } from '@/lib/services/insumo-fornecedor-ignorado-manager';

describe('InsumoFornecedorIgnoradoManager', () => {
  const upsert = vi.fn();
  const deleteByCnpj = vi.fn();
  const listIdsAndCnpjByEmpresaStatus = vi.fn();
  const marcarIgnoradasPorIds = vi.fn();
  const marcarPendentesPorIds = vi.fn();

  let manager: InsumoFornecedorIgnoradoManager;

  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ id: '1', fornecedor_cnpj: '11725898000181' });
    deleteByCnpj.mockResolvedValue(undefined);
    listIdsAndCnpjByEmpresaStatus.mockResolvedValue([]);
    marcarIgnoradasPorIds.mockResolvedValue(0);
    marcarPendentesPorIds.mockResolvedValue(0);

    manager = new InsumoFornecedorIgnoradoManager({
      fornecedorIgnoradoRepository: { upsert, deleteByCnpj } as never,
      pendenciaRepository: {
        listIdsAndCnpjByEmpresaStatus,
        marcarIgnoradasPorIds,
        marcarPendentesPorIds,
      } as never,
    });
  });

  it('rejeita CNPJ inválido ao marcar', async () => {
    await expect(
      manager.marcarFornecedor({ empresaId: 'e1', cnpj: 'abc' }),
    ).rejects.toThrow(/CNPJ/i);
  });

  it('faz upsert e ignora pendentes com mesmo CNPJ normalizado em batch', async () => {
    listIdsAndCnpjByEmpresaStatus.mockResolvedValue([
      { id: 'p1', fornecedor_cnpj: '11.725.898/0001-81' },
      { id: 'p2', fornecedor_cnpj: '99999999000199' },
    ]);
    marcarIgnoradasPorIds.mockResolvedValue(1);

    const result = await manager.marcarFornecedor({
      empresaId: 'e1',
      cnpj: '11.725.898/0001-81',
      nome: 'HIG',
    });

    expect(upsert).toHaveBeenCalledWith({
      empresaId: 'e1',
      cnpjDigits: '11725898000181',
      nome: 'HIG',
      razao: undefined,
      criadoPor: undefined,
    });
    expect(listIdsAndCnpjByEmpresaStatus).toHaveBeenCalledWith('e1', 'pendente');
    expect(marcarIgnoradasPorIds).toHaveBeenCalledWith(['p1']);
    expect(result).toEqual({
      cnpj: '11725898000181',
      pendenciasIgnoradas: 1,
    });
  });

  it('compensa deleteByCnpj se batch de marcarIgnoradas falhar após upsert', async () => {
    listIdsAndCnpjByEmpresaStatus.mockResolvedValue([
      { id: 'p1', fornecedor_cnpj: '11725898000181' },
    ]);
    marcarIgnoradasPorIds.mockRejectedValue(new Error('falha batch'));

    await expect(
      manager.marcarFornecedor({
        empresaId: 'e1',
        cnpj: '11725898000181',
      }),
    ).rejects.toThrow(/falha batch/);

    expect(deleteByCnpj).toHaveBeenCalledWith('e1', '11725898000181');
  });

  it('desmarcar com restaurar chama marcarPendentesPorIds só do CNPJ', async () => {
    listIdsAndCnpjByEmpresaStatus.mockResolvedValue([
      { id: 'i1', fornecedor_cnpj: '11725898000181' },
      { id: 'i2', fornecedor_cnpj: '00000000000191' },
    ]);
    marcarPendentesPorIds.mockResolvedValue(1);

    const result = await manager.desmarcarFornecedor({
      empresaId: 'e1',
      cnpj: '11725898000181',
      restaurarPendencias: true,
    });

    expect(deleteByCnpj).toHaveBeenCalledWith('e1', '11725898000181');
    expect(listIdsAndCnpjByEmpresaStatus).toHaveBeenCalledWith('e1', 'ignorado');
    expect(marcarPendentesPorIds).toHaveBeenCalledWith(['i1']);
    expect(result).toEqual({
      cnpj: '11725898000181',
      pendenciasRestauradas: 1,
    });
  });

  it('desmarcar sem restaurar não chama marcarPendentesPorIds', async () => {
    const result = await manager.desmarcarFornecedor({
      empresaId: 'e1',
      cnpj: '11725898000181',
      restaurarPendencias: false,
    });

    expect(deleteByCnpj).toHaveBeenCalledWith('e1', '11725898000181');
    expect(listIdsAndCnpjByEmpresaStatus).not.toHaveBeenCalled();
    expect(marcarPendentesPorIds).not.toHaveBeenCalled();
    expect(result).toEqual({
      cnpj: '11725898000181',
      pendenciasRestauradas: 0,
    });
  });
});
