import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireInternoModulo: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

vi.mock('@/lib/auth/require-interno-modulo', () => ({
  requireInternoModulo: mocks.requireInternoModulo,
}));
vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: { createServiceRoleClient: mocks.createServiceRoleClient },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { apagarCargo, gravarCargo, listarCargos, listarOpcoesCargo } from './pessoas-cargo-actions';

const ID = '11111111-1111-4111-8111-111111111111';

describe('ações de cargos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireInternoModulo.mockRejectedValue(new Error('Sem permissão'));
  });

  it('recusa a listagem da faixa antes de abrir o banco', async () => {
    await expect(listarCargos()).rejects.toThrow('Sem permissão');
    expect(mocks.requireInternoModulo).toHaveBeenCalledWith('interno_pessoas', 'administrar');
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('recusa gravar e apagar antes de abrir o banco', async () => {
    await expect(gravarCargo({ nome: 'Auxiliar', de: '1', ate: '2' })).rejects.toThrow('Sem permissão');
    await expect(apagarCargo(ID)).rejects.toThrow('Sem permissão');
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('recusa faixa inválida antes de abrir o banco', async () => {
    mocks.requireInternoModulo.mockResolvedValue(undefined);
    const resultado = await gravarCargo({ nome: '', de: '', ate: '' });
    expect(resultado).toEqual({ ok: false, mensagem: 'Informe o nome do cargo.' });
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('lista só id e nome para quem lê pessoas', async () => {
    mocks.requireInternoModulo.mockResolvedValue(undefined);
    const order = vi.fn().mockResolvedValue({
      data: [{ id: ID, nome: 'Auxiliar', de_centavos: 1, ate_centavos: 2 }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.createServiceRoleClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });
    const opcoes = await listarOpcoesCargo();
    expect(mocks.requireInternoModulo).toHaveBeenCalledWith('interno_pessoas', 'ler');
    expect(select).toHaveBeenCalledWith('id, nome');
    expect(eq).toHaveBeenCalledWith('ativo', true);
    expect(opcoes).toEqual([{ id: ID, nome: 'Auxiliar' }]);
  });
});
