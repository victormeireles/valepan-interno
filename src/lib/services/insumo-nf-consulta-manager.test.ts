import { describe, expect, it } from 'vitest';
import {
  insumoNfDetalheStatusLabel,
  type InsumoNfConsultaContexto,
  type InsumoNfMovimentoEntrada,
} from '@/domain/insumos/insumo-nf-detalhe';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { InsumoNfConsultaManager } from './insumo-nf-consulta-manager';

function buildPendencia(
  overrides: Partial<InsumoPendenciaComEmpresa> = {},
): InsumoPendenciaComEmpresa {
  return {
    id: 'pend-1',
    empresa_id: 'emp-1',
    omie_webhook_evento_id: null,
    omie_n_id_receb: 100,
    omie_n_id_item: 1,
    omie_id_produto: 59016,
    omie_codigo_produto: '59016',
    descricao_produto: 'Farinha',
    quantidade_nf: 10,
    unidade_nf: 'SC',
    preco_unit_nf: 25,
    valor_total_item: 250,
    numero_nf: '000000123',
    data_emissao_nf: '2026-09-10',
    fornecedor_razao_social: 'Fornecedor Razão Social',
    fornecedor_nome: 'Fornecedor',
    fornecedor_cnpj: '12345678000199',
    natureza_operacao: 'Compra',
    valor_total_nf: 250,
    cfop_entrada: '1102',
    ncm_produto: '11010010',
    categoria_compra_codigo: '1.01',
    categoria_compra_descricao: 'Matéria-prima',
    status: 'resolvido',
    integracao_insumo_id: 'vinc-1',
    resolvido_em: '2026-09-10T12:00:00Z',
    created_at: '2026-09-10T10:00:00Z',
    empresaNome: 'Nova Resende',
    ...overrides,
  };
}

function buildMovimento(
  overrides: Partial<InsumoNfMovimentoEntrada> = {},
): InsumoNfMovimentoEntrada {
  return {
    id: 'mov-1',
    createdAt: '2026-09-10T12:00:00Z',
    numeroNf: '000000123',
    deltaQuantidade: 500,
    custoUnitario: 0.5,
    omieNIdReceb: 100,
    omieNIdItem: 1,
    ...overrides,
  };
}

const contexto: InsumoNfConsultaContexto = {
  fatorConversao: 50,
  unidadeEstoque: 'KG',
  unidadeNfVinculo: 'SC',
  insumoNome: 'Farinha de trigo',
};

describe('InsumoNfConsultaManager', () => {
  const manager = new InsumoNfConsultaManager();

  it('mantém a pendência resolvida quando existe movimento com a mesma chave', () => {
    const resultado = manager.unir([buildPendencia()], [buildMovimento()], contexto);

    expect(resultado).toEqual([
      expect.objectContaining({
        id: 'pend-1',
        status: 'resolvido',
        quantidadeEstoque: 500,
        unidadeEstoque: 'KG',
        insumoNome: 'Farinha de trigo',
      }),
    ]);
  });

  it('inclui movimento sem pendência como NF lançada', () => {
    const resultado = manager.unir(
      [],
      [
        buildMovimento({
          id: 'mov-59044',
          numeroNf: '000059044',
          deltaQuantidade: 250,
          custoUnitario: 2,
          omieNIdReceb: 59044,
          omieNIdItem: 2,
        }),
      ],
      contexto,
    );

    expect(resultado[0]).toEqual({
      id: 'mov-59044',
      numeroNf: '000059044',
      data: '2026-09-10T12:00:00Z',
      quantidadeNf: 5,
      unidadeNf: 'SC',
      quantidadeEstoque: 250,
      unidadeEstoque: 'KG',
      valorItem: 500,
      fornecedor: null,
      cfop: null,
      ncm: null,
      categoria: null,
      natureza: null,
      insumoNome: 'Farinha de trigo',
      status: 'lancada',
      omieNIdReceb: 59044,
      omieNIdItem: 2,
    });
  });

  it('não colapsa pendências diferentes sem chave Omie válida', () => {
    const resultado = manager.unir(
      [
        buildPendencia({ id: 'pend-a', omie_n_id_receb: 0, omie_n_id_item: 0 }),
        buildPendencia({ id: 'pend-b', omie_n_id_receb: 0, omie_n_id_item: 0 }),
      ],
      [],
      contexto,
    );

    expect(resultado.map((item) => item.id)).toEqual(['pend-a', 'pend-b']);
  });

  it('ordena por data decrescente e deixa itens sem data por último', () => {
    const resultado = manager.unir(
      [
        buildPendencia({
          id: 'sem-data',
          data_emissao_nf: null,
          omie_n_id_item: 1,
        }),
        buildPendencia({
          id: 'antiga',
          data_emissao_nf: '2026-09-01',
          omie_n_id_item: 2,
        }),
        buildPendencia({
          id: 'recente',
          data_emissao_nf: '2026-09-12',
          omie_n_id_item: 3,
        }),
      ],
      [],
      contexto,
    );

    expect(resultado.map((item) => item.id)).toEqual(['recente', 'antiga', 'sem-data']);
  });
});

describe('insumoNfDetalheStatusLabel', () => {
  it.each([
    ['pendente', 'Pendente'],
    ['ignorado', 'Ignorada'],
    ['resolvido', 'Resolvida'],
    ['lancada', 'Lançada'],
  ] as const)('mapeia %s para %s', (status, label) => {
    expect(insumoNfDetalheStatusLabel(status)).toBe(label);
  });
});
