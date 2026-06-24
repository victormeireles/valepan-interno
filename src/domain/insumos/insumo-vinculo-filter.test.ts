import { describe, expect, it } from 'vitest';
import { filterIntegracaoInsumos } from '@/domain/insumos/insumo-vinculo-filter';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';

function buildItem(overrides: Partial<IntegracaoInsumoListItem> = {}): IntegracaoInsumoListItem {
  return {
    id: '1',
    empresa_id: 'emp-1',
    omie_id_produto: 59016,
    omie_codigo_produto: '59016',
    insumo_id: 'ins-1',
    fator_conversao: 1,
    descricao_omie: 'Alcool Etilico',
    ativo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    empresaNome: 'Nova Resende',
    insumoNome: 'Etanol',
    insumoUnidadeCodigo: 'LT',
    insumoUnidadeNome: 'Litro',
    ...overrides,
  };
}

describe('filterIntegracaoInsumos', () => {
  it('filtra por produto Omie, insumo ou empresa', () => {
    const items = [
      buildItem(),
      buildItem({
        id: '2',
        omie_id_produto: 123,
        descricao_omie: 'Acucar refinado',
        insumoNome: 'Açúcar',
        empresaNome: 'Valepan SP',
      }),
    ];

    expect(filterIntegracaoInsumos(items, 'alcool')).toHaveLength(1);
    expect(filterIntegracaoInsumos(items, 'açúcar')).toHaveLength(1);
    expect(filterIntegracaoInsumos(items, 'nova')).toHaveLength(1);
  });
});
