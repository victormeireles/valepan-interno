import { describe, expect, it, vi, beforeEach } from 'vitest';

const eqMock = vi.fn();
const orderMock = vi.fn();

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: (...eqArgs: unknown[]) => {
            eqMock(...eqArgs);
            return {
              eq: (...eqArgs2: unknown[]) => {
                eqMock(...eqArgs2);
                return Promise.resolve({
                  data: [
                    { id: 'cat-1', visivel_embalagem: true },
                    { id: 'cat-3', visivel_embalagem: true },
                  ],
                  error: null,
                });
              },
              order: (...orderArgs: unknown[]) => {
                orderMock(...orderArgs);
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        })),
      })),
    })),
  },
}));

const { CategoriaVisibilidadeManager } = await import('./categoria-visibilidade-manager');

describe('CategoriaVisibilidadeManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getIdsVisiveisEmbalagem retorna Set de ids visíveis', async () => {
    const manager = new CategoriaVisibilidadeManager();
    const ids = await manager.getIdsVisiveisEmbalagem();

    expect(ids).toEqual(new Set(['cat-1', 'cat-3']));
    expect(eqMock).toHaveBeenCalledWith('ativo', true);
    expect(eqMock).toHaveBeenCalledWith('visivel_embalagem', true);
  });
});
