import { describe, expect, it } from 'vitest';
import { enrichIntegracaoInsumosComFornecedor } from '@/domain/insumos/insumo-vinculo-fornecedor';
import type {
  InsumoPendenciaComEmpresa,
  IntegracaoInsumoListItemBase,
} from '@/domain/types/insumo-estoque-db';

function buildVinculo(
  overrides: Partial<IntegracaoInsumoListItemBase> = {},
): IntegracaoInsumoListItemBase {
  return {
    id: 'vinc-1',
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

function buildPendencia(
  overrides: Partial<InsumoPendenciaComEmpresa> = {},
): InsumoPendenciaComEmpresa {
  return {
    id: 'pend-1',
    empresa_id: 'emp-1',
    omie_webhook_evento_id: null,
    omie_n_id_receb: 1,
    omie_n_id_item: 1,
    omie_id_produto: 59016,
    omie_codigo_produto: '59016',
    descricao_produto: 'Alcool Etilico',
    quantidade_nf: 10,
    unidade_nf: 'LT',
    preco_unit_nf: 5,
    valor_total_item: 50,
    numero_nf: '123',
    data_emissao_nf: '2026-01-01',
    fornecedor_razao_social: 'CORDEX INDUSTRIA LTDA',
    fornecedor_nome: 'CORDEX',
    fornecedor_cnpj: '12345678000199',
    natureza_operacao: null,
    valor_total_nf: 50,
    cfop_entrada: '1102',
    ncm_produto: null,
    categoria_compra_codigo: null,
    categoria_compra_descricao: null,
    status: 'resolvido',
    integracao_insumo_id: 'vinc-1',
    resolvido_em: '2026-01-02T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    empresaNome: 'Nova Resende',
    ...overrides,
  };
}

describe('enrichIntegracaoInsumosComFornecedor', () => {
  it('agrega fornecedor das pendências do mesmo produto Omie', () => {
    const vinculos = enrichIntegracaoInsumosComFornecedor(
      [buildVinculo()],
      [buildPendencia()],
    );

    expect(vinculos[0]!.contexto.fornecedorTitulo).toBe('CORDEX');
    expect(vinculos[0]!.contexto.fornecedoresDistintos).toBe(1);
    expect(vinculos[0]!.nfsDistintas).toBe(1);
    expect(vinculos[0]!.pendenciaCount).toBe(1);
    expect(vinculos[0]!.valorUnitarioNf).toBe(5);
    expect(vinculos[0]!.unidadeNf).toBe('LT');
  });

  it('retorna contexto vazio quando não há pendências do produto', () => {
    const vinculos = enrichIntegracaoInsumosComFornecedor([buildVinculo()], []);

    expect(vinculos[0]!.contexto.fornecedorTitulo).toBe('Sem dados de fornecedor');
    expect(vinculos[0]!.valorUnitarioNf).toBeNull();
  });
});
