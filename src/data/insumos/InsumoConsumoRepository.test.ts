import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { InsumoConsumoPeriodo } from '@/domain/insumos/insumo-consumo-semanal-periodo';
import type { Database } from '@/types/database';
import { InsumoConsumoRepository } from './InsumoConsumoRepository';

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: vi.fn().mockReturnValue({}),
  },
}));

const periodo: InsumoConsumoPeriodo = {
  dataInicio: '2026-07-05',
  dataFim: '2026-08-01',
  visualizacao: 'semanal',
  colunas: [
    { inicio: '2026-07-05', fim: '2026-07-11', label: '05/07 a 11/07' },
    { inicio: '2026-07-12', fim: '2026-07-18', label: '12/07 a 18/07' },
  ],
};

describe('InsumoConsumoRepository.listConsumoSemanal', () => {
  it('consulta a RPC agregada em vez de paginar movimentos brutos', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          insumo_id: 'farinha',
          nome: 'Farinha',
          unidade_resumida: 'KG',
          coluna_inicio: '2026-07-05',
          consumo: 12.5,
        },
      ],
      error: null,
    });
    const from = vi.fn();
    const client = { rpc, from } as unknown as SupabaseClient<Database>;
    const repository = new InsumoConsumoRepository(client);

    const items = await repository.listConsumoSemanal(periodo);

    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('list_insumo_consumo_agregado', {
      p_start: expect.any(String),
      p_end: expect.any(String),
      p_visualizacao: 'semanal',
    });
    expect(items).toEqual([
      expect.objectContaining({
        insumoId: 'farinha',
        nome: 'Farinha',
        unidadeResumida: 'KG',
        total: 12.5,
        consumoPorSemana: {
          '2026-07-05': 12.5,
          '2026-07-12': 0,
        },
      }),
    ]);
  });

  it('propaga erro da RPC de consumo agregado', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'timeout' },
    });
    const client = { rpc, from: vi.fn() } as unknown as SupabaseClient<Database>;
    const repository = new InsumoConsumoRepository(client);

    await expect(repository.listConsumoSemanal(periodo)).rejects.toThrow(
      'Erro ao listar consumo de insumos: timeout',
    );
  });
});
