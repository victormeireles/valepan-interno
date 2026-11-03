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

import {
  apagarRemuneracaoColaborador,
  gravarRemuneracaoColaborador,
  listarRemuneracaoColaborador,
} from './pessoas-remuneracao-actions';

describe('ações de remuneração de colaboradores', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireInternoModulo.mockRejectedValue(new Error('Sem permissão'));
  });

  it('recusa a listagem antes de abrir o banco', async () => {
    await expect(listarRemuneracaoColaborador('COL-1')).rejects.toThrow('Sem permissão');
    expect(mocks.requireInternoModulo).toHaveBeenCalledWith('interno_pessoas', 'administrar');
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('recusa a gravação antes de abrir o banco', async () => {
    await expect(
      gravarRemuneracaoColaborador('COL-1', { inicio: '2026-01-01', salario: '3000,00' }),
    ).rejects.toThrow('Sem permissão');
    expect(mocks.requireInternoModulo).toHaveBeenCalledWith('interno_pessoas', 'administrar');
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('recusa a exclusão antes de abrir o banco', async () => {
    await expect(apagarRemuneracaoColaborador('COL-1', '2026-01-01')).rejects.toThrow('Sem permissão');
    expect(mocks.requireInternoModulo).toHaveBeenCalledWith('interno_pessoas', 'administrar');
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });
});
