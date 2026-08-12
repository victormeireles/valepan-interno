import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/types/database';
import { InsumoDistribuidorRepository } from './InsumoDistribuidorRepository';

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: vi.fn().mockReturnValue({}),
  },
}));

describe('InsumoDistribuidorRepository.replaceForInsumo', () => {
  it('substitui distribuidores em uma única chamada RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn();
    const client = { rpc, from } as unknown as SupabaseClient<Database>;
    const repository = new InsumoDistribuidorRepository(client);
    const items = [
      { nome: 'Fornecedor A', preferencial: true, ordem: 0 },
      { nome: 'Fornecedor B', preferencial: false, ordem: 1 },
    ];

    await repository.replaceForInsumo('insumo-1', items);

    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('replace_insumo_distribuidores', {
      p_insumo_id: 'insumo-1',
      p_items: items,
    });
  });

  it('propaga erro sem executar uma segunda operação', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'falha transacional' },
    });
    const client = { rpc, from: vi.fn() } as unknown as SupabaseClient<Database>;
    const repository = new InsumoDistribuidorRepository(client);

    await expect(repository.replaceForInsumo('insumo-1', [])).rejects.toThrow(
      'Erro ao substituir distribuidores do insumo: falha transacional',
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
