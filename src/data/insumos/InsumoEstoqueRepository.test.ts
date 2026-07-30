import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { InsumoEstoqueRepository } from './InsumoEstoqueRepository';
import type { Database } from '@/types/database';

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: vi.fn().mockReturnValue({}),
  },
}));

function createRepositoryWithQueryResult(result: {
  data: { insumo_id: string; quantidade: number | null }[] | null;
  error: { message: string } | null;
}) {
  const inFilter = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ in: inFilter });
  const from = vi.fn().mockReturnValue({ select });
  const client = { from } as unknown as SupabaseClient<Database>;

  return {
    repository: new InsumoEstoqueRepository(client),
    from,
    select,
    inFilter,
  };
}

describe('InsumoEstoqueRepository.listQuantidadesByInsumoIds', () => {
  it('retorna um mapa com as quantidades numéricas dos insumos', async () => {
    const { repository, inFilter } = createRepositoryWithQueryResult({
      data: [
        { insumo_id: 'farinha', quantidade: 12.5 },
        { insumo_id: 'sal', quantidade: null },
      ],
      error: null,
    });

    const result = await repository.listQuantidadesByInsumoIds(['farinha', 'sal']);

    expect(inFilter).toHaveBeenCalledWith('insumo_id', ['farinha', 'sal']);
    expect(result).toEqual(
      new Map([
        ['farinha', 12.5],
        ['sal', 0],
      ]),
    );
  });

  it('não consulta o banco quando não há insumos', async () => {
    const { repository, from } = createRepositoryWithQueryResult({
      data: [],
      error: null,
    });

    await expect(repository.listQuantidadesByInsumoIds([])).resolves.toEqual(new Map());
    expect(from).not.toHaveBeenCalled();
  });
});
