import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { ConsumoMovimentoWithInsumo } from './InsumoConsumoRepository';
import { InsumoConsumoProdutoResolver } from './InsumoConsumoProdutoResolver';

function createEmbalagemClient(inFilter: ReturnType<typeof vi.fn>) {
  const select = vi.fn().mockReturnValue({ in: inFilter });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, client: { from } as unknown as SupabaseClient };
}

function buildEmbalagemMovimentos(count: number): ConsumoMovimentoWithInsumo[] {
  return Array.from({ length: count }, (_, index) => ({
    insumo_id: 'alcool',
    created_at: '2026-08-10T12:00:00.000Z',
    delta_quantidade: -0.01,
    origem: 'producao_embalagem',
    fermentacao_lote_id: null,
    forno_lote_id: null,
    embalagem_lote_id: `lote-${String(index).padStart(4, '0')}`,
    insumos: { nome: 'Álcool', unidades: { nome_resumido: 'L' } },
  }));
}

describe('InsumoConsumoProdutoResolver', () => {
  it('consulta lotes de embalagem em chunks para evitar Bad Request por URL longa', async () => {
    const inFilter = vi.fn().mockImplementation((_column: string, ids: string[]) =>
      Promise.resolve({
        data: ids.map((id) => ({
          id,
          produto_id: `produto-${id}`,
          produtos: { nome: `Produto ${id}` },
        })),
        error: null,
      }),
    );
    const { client, from } = createEmbalagemClient(inFilter);
    const resolver = new InsumoConsumoProdutoResolver(client);
    const movimentos = buildEmbalagemMovimentos(250);

    const produtosByLote = await resolver.resolveByMovimentos(movimentos);

    expect(from).toHaveBeenCalledWith('embalagem_lotes');
    expect(inFilter.mock.calls.length).toBeGreaterThan(1);
    expect(
      inFilter.mock.calls.every((call) => {
        const ids = call[1] as string[];
        return ids.length <= 100;
      }),
    ).toBe(true);
    expect(produtosByLote.size).toBe(250);
    expect(produtosByLote.get('lote-0000')).toEqual({
      produtoId: 'produto-lote-0000',
      produtoNome: 'Produto lote-0000',
    });
  });

  it('consulta lotes de fermentação/forno em chunks', async () => {
    const inFilter = vi.fn().mockImplementation((_column: string, ids: string[]) =>
      Promise.resolve({
        data: ids.map((id) => ({
          id,
          ordens_producao: {
            produto_id: `produto-${id}`,
            produtos: { nome: `Produto ${id}` },
          },
        })),
        error: null,
      }),
    );
    const select = vi.fn().mockReturnValue({ in: inFilter });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient;
    const resolver = new InsumoConsumoProdutoResolver(client);
    const movimentos: ConsumoMovimentoWithInsumo[] = Array.from(
      { length: 150 },
      (_, index) => ({
        insumo_id: 'farinha',
        created_at: '2026-08-10T12:00:00.000Z',
        delta_quantidade: -1,
        origem: 'producao_fermentacao',
        fermentacao_lote_id: `ferm-${String(index).padStart(4, '0')}`,
        forno_lote_id: null,
        embalagem_lote_id: null,
        insumos: { nome: 'Farinha', unidades: { nome_resumido: 'KG' } },
      }),
    );

    const produtosByLote = await resolver.resolveByMovimentos(movimentos);

    expect(from).toHaveBeenCalledWith('fermentacao_lotes');
    expect(inFilter.mock.calls.length).toBeGreaterThan(1);
    expect(produtosByLote.size).toBe(150);
  });
});
