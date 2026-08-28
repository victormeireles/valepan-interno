import { describe, expect, it, vi } from 'vitest';
import { CATEGORIA_EM_USO_MESSAGE } from '@/domain/reclamacoes/reclamacao-categoria-exclusao';
import { ReclamacaoCategoriaService } from './reclamacao-categoria-service';

function repo(overrides: Partial<{
  countByCategoriaId: (id: string) => Promise<number>;
  deleteById: (id: string) => Promise<void>;
  insert: (input: unknown) => Promise<unknown>;
}>) {
  return {
    listAll: vi.fn(),
    listAtivas: vi.fn(),
    findById: vi.fn(),
    countByCategoriaId: vi.fn().mockResolvedValue(0),
    insert: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
    ...overrides,
  };
}

describe('ReclamacaoCategoriaService.remove', () => {
  it('apaga quando count é 0', async () => {
    const r = repo({ deleteById: vi.fn().mockResolvedValue(undefined) });
    const service = new ReclamacaoCategoriaService(r as never);
    await service.remove('cat-1');
    expect(r.deleteById).toHaveBeenCalledWith('cat-1');
  });

  it('recusa quando há reclamação', async () => {
    const r = repo({
      countByCategoriaId: vi.fn().mockResolvedValue(2),
      deleteById: vi.fn(),
    });
    const service = new ReclamacaoCategoriaService(r as never);
    await expect(service.remove('cat-1')).rejects.toThrow(CATEGORIA_EM_USO_MESSAGE);
    expect(r.deleteById).not.toHaveBeenCalled();
  });
});
