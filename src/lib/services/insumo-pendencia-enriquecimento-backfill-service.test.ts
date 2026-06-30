import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/data/insumos/InsumoPendenciaRepository', () => ({
  insumoPendenciaRepository: {},
  InsumoPendenciaRepository: class {},
}));
vi.mock('@/lib/clients/omie-recebimento-client', () => ({
  omieRecebimentoClient: {},
  OmieRecebimentoClient: class {},
}));

import type { InsumoEntradaPendenciaRow } from '@/domain/types/insumo-estoque-db';

const { InsumoPendenciaEnriquecimentoBackfillService } = await import(
  './insumo-pendencia-enriquecimento-backfill-service'
);

const consultarRecebimento = vi.fn();
const listParaEnriquecimento = vi.fn();
const atualizarEnriquecimentoOmie = vi.fn();
const resolverCategoriaRecebimento = vi.fn();
const resolverCategoriaItem = vi.fn();

const categoriaService = {
  resolverCategoriaRecebimento,
  resolverCategoriaItem,
};

const empresa = {
  id: 'emp-1',
  nome: 'Valepan',
  app_key: 'key',
  app_secret: 'secret',
};

function criarPendencia(
  overrides: Partial<InsumoEntradaPendenciaRow> = {},
): InsumoEntradaPendenciaRow {
  return {
    id: 'pend-1',
    empresa_id: 'emp-1',
    omie_webhook_evento_id: null,
    omie_n_id_receb: 100,
    omie_n_id_item: 10,
    omie_id_produto: 500,
    omie_codigo_produto: 'MP01',
    descricao_produto: 'Farinha',
    quantidade_nf: 100,
    unidade_nf: 'KG',
    preco_unit_nf: 2,
    valor_total_item: 200,
    numero_nf: null,
    data_emissao_nf: null,
    fornecedor_razao_social: null,
    fornecedor_nome: null,
    fornecedor_cnpj: null,
    natureza_operacao: null,
    valor_total_nf: null,
    cfop_entrada: null,
    ncm_produto: null,
    categoria_compra_codigo: null,
    categoria_compra_descricao: null,
    status: 'pendente',
    integracao_insumo_id: null,
    resolvido_em: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('InsumoPendenciaEnriquecimentoBackfillService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrupa recebimentos e atualiza pendências com dados da Omie', async () => {
    listParaEnriquecimento.mockResolvedValue([
      criarPendencia({ id: 'pend-1', omie_n_id_item: 10 }),
      criarPendencia({ id: 'pend-2', omie_n_id_item: 11 }),
    ]);

    consultarRecebimento.mockResolvedValue({
      cabec: {
        cNumeroNF: '12345',
        dDataEmissao: '23/06/2026',
        fornecedorRazaoSocial: 'Fornecedor LTDA',
        fornecedorNome: 'Fornecedor',
        fornecedorCnpj: '12345678000199',
        naturezaOperacao: 'Compra',
        valorTotalNf: 500,
        chaveNfe: null,
      },
      infoAdicionais: { cCategCompra: '2.01.01' },
      itensCabec: [
        {
          nIdItem: 10,
          nIdProduto: 500,
          cCodigoProduto: 'MP01',
          cDescricaoProduto: 'Farinha',
          cUnidadeNfe: 'KG',
          nQtdeNfe: 100,
          nPrecoUnit: 2,
          vTotalItem: 200,
          cIgnorarItem: 'N',
          cfopEntrada: '1102',
          ncm: '11010010',
          categoriaItem: null,
        },
        {
          nIdItem: 11,
          nIdProduto: 501,
          cCodigoProduto: 'MP02',
          cDescricaoProduto: 'Açúcar',
          cUnidadeNfe: 'KG',
          nQtdeNfe: 50,
          nPrecoUnit: 3,
          vTotalItem: 150,
          cIgnorarItem: 'N',
          cfopEntrada: '1102',
          ncm: '17019900',
          categoriaItem: null,
        },
      ],
    });
    resolverCategoriaRecebimento.mockResolvedValue({
      codigo: '2.01.01',
      descricao: 'Compras de Mercadorias para Revenda',
    });
    resolverCategoriaItem.mockResolvedValue({
      codigo: '2.01.01',
      descricao: 'Compras de Mercadorias para Revenda',
    });

    const service = new InsumoPendenciaEnriquecimentoBackfillService({
      pendenciaRepository: {
        listParaEnriquecimento,
        atualizarEnriquecimentoOmie,
      } as never,
      client: { consultarRecebimento } as never,
      categoriaService: categoriaService as never,
      listarEmpresas: async () => [empresa],
      listarChavesProdutosVinculados: async () => new Set(),
    });

    const result = await service.executar();

    expect(consultarRecebimento).toHaveBeenCalledTimes(1);
    expect(atualizarEnriquecimentoOmie).toHaveBeenCalledTimes(2);
    expect(atualizarEnriquecimentoOmie).toHaveBeenCalledWith(
      'pend-1',
      expect.objectContaining({
        fornecedorRazaoSocial: 'Fornecedor LTDA',
        cfopEntrada: '1102',
        ncmProduto: '11010010',
        categoriaCompraCodigo: '2.01.01',
        categoriaCompraDescricao: 'Compras de Mercadorias para Revenda',
      }),
    );
    expect(result).toEqual({
      recebimentosConsultados: 1,
      pendenciasAtualizadas: 2,
      pendenciasSemItem: 0,
      erros: 0,
    });
  });

  it('em dry-run não consulta Omie nem atualiza pendências', async () => {
    listParaEnriquecimento.mockResolvedValue([criarPendencia()]);

    const service = new InsumoPendenciaEnriquecimentoBackfillService({
      pendenciaRepository: {
        listParaEnriquecimento,
        atualizarEnriquecimentoOmie,
      } as never,
      client: { consultarRecebimento } as never,
      categoriaService: categoriaService as never,
      listarEmpresas: async () => [empresa],
      listarChavesProdutosVinculados: async () => new Set(),
    });

    const result = await service.executar({ dryRun: true });

    expect(consultarRecebimento).not.toHaveBeenCalled();
    expect(atualizarEnriquecimentoOmie).not.toHaveBeenCalled();
    expect(result.recebimentosConsultados).toBe(1);
    expect(result.pendenciasAtualizadas).toBe(0);
  });
});
