import { describe, expect, it, vi, beforeEach } from 'vitest';

const eqMock = vi.fn();
const orderMock = vi.fn();
const selectResolve = vi.fn();

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: (...eqArgs: unknown[]) => {
            eqMock(...eqArgs);
            return {
              order: (...orderArgs: unknown[]) => {
                orderMock(...orderArgs);
                return Promise.resolve(selectResolve());
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

  it('getIdsVisiveisEmbalagem inclui categorias sempre visíveis pelo nome', async () => {
    selectResolve.mockResolvedValueOnce({
      data: [
        { id: 'cat-hamb', nome: 'Hambúrguer', visivel_embalagem: false },
        { id: 'cat-forma', nome: 'Pão de Forma', visivel_embalagem: false },
      ],
      error: null,
    });

    const manager = new CategoriaVisibilidadeManager();
    const ids = await manager.getIdsVisiveisEmbalagem();

    expect(ids).toEqual(new Set(['cat-hamb']));
    expect(eqMock).toHaveBeenCalledWith('ativo', true);
  });
});
