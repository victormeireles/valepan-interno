import { describe, expect, it } from 'vitest';
import { filterIntegracaoInsumos } from '@/domain/insumos/insumo-vinculo-filter';
import { buildPendenciaGrupoContexto } from '@/domain/insumos/insumo-pendencia-grupo-contexto';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';

const contextoVazio = buildPendenciaGrupoContexto([]);

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
    contexto: contextoVazio,
    valorUnitarioNf: null,
    unidadeNf: null,
    nfsDistintas: 0,
    pendenciaCount: 0,
    ...overrides,
  };
}

describe('filterIntegracaoInsumos', () => {
  it('filtra por produto Omie, insumo, empresa ou fornecedor', () => {
    const items = [
      buildItem(),
      buildItem({
        id: '2',
        omie_id_produto: 123,
        descricao_omie: 'Acucar refinado',
        insumoNome: 'Açúcar',
        empresaNome: 'Valepan SP',
        contexto: buildPendenciaGrupoContexto([
          {
            id: 'p1',
            empresa_id: 'emp-2',
            omie_webhook_evento_id: null,
            omie_n_id_receb: 1,
            omie_n_id_item: 1,
            omie_id_produto: 123,
            omie_codigo_produto: '123',
            descricao_produto: 'Acucar refinado',
            quantidade_nf: 1,
            unidade_nf: 'KG',
            preco_unit_nf: 1,
            valor_total_item: 1,
            numero_nf: '1',
            data_emissao_nf: null,
            fornecedor_razao_social: 'Distribuidora Norte SA',
            fornecedor_nome: 'Norte',
            fornecedor_cnpj: null,
            natureza_operacao: null,
            valor_total_nf: null,
            cfop_entrada: null,
            ncm_produto: null,
            categoria_compra_codigo: null,
            categoria_compra_descricao: null,
            status: 'resolvido',
            integracao_insumo_id: '2',
            resolvido_em: null,
            created_at: '2026-01-01T00:00:00Z',
            empresaNome: 'Valepan SP',
          },
        ]),
      }),
    ];

    expect(filterIntegracaoInsumos(items, 'alcool')).toHaveLength(1);
    expect(filterIntegracaoInsumos(items, 'açúcar')).toHaveLength(1);
    expect(filterIntegracaoInsumos(items, 'nova')).toHaveLength(1);
    expect(filterIntegracaoInsumos(items, 'norte')).toHaveLength(1);
  });
});
