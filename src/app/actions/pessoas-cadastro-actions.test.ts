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

import { atualizarCadastroColaborador } from './pessoas-cadastro-actions';

const CARGO = '11111111-1111-4111-8111-111111111111';

describe('cargo no cadastro do colaborador', () => {
  const update = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireInternoModulo.mockResolvedValue(undefined);
    update.mockReturnValue({
      eq: () => ({ select: async () => ({ data: [{ codigo: 'COL-1' }], error: null }) }),
    });
    mocks.createServiceRoleClient.mockReturnValue({
      from: (tabela: string) => clienteDe(tabela, update),
    });
  });

  it('não grava cargo inexistente', async () => {
    const resultado = await atualizarCadastroColaborador('COL-1', { cargoId: CARGO });
    expect(resultado).toEqual({ ok: false, mensagem: 'Cargo inválido.' });
    expect(update).not.toHaveBeenCalled();
  });
});

function clienteDe(tabela: string, update: ReturnType<typeof vi.fn>) {
  if (tabela === 'pessoas_cargos') {
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  }
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { id: 'p1', regime: 'clt', situacao: 'ativo', data_desligamento: null, cargo_id: null },
          error: null,
        }),
      }),
    }),
    update,
  };
}
