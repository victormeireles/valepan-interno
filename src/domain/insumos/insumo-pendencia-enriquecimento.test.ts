import { describe, expect, it } from 'vitest';
import {
  indexarItensRecebimentoPorIdItem,
  montarEnriquecimentoPendencia,
} from './insumo-pendencia-enriquecimento';

describe('insumo-pendencia-enriquecimento', () => {
  it('monta campos de enriquecimento a partir do recebimento Omie', () => {
    const result = montarEnriquecimentoPendencia({
      cabec: {
        cNumeroNF: '000423283',
        dDataEmissao: '22/06/2026',
        fornecedorRazaoSocial: 'CLEAN MIX PROD DE HIG E LIMP LTDA',
        fornecedorNome: 'CLEAN MIX',
        fornecedorCnpj: '11.725.898/0001-81',
        naturezaOperacao: 'VENDA NO ESTADO',
        valorTotalNf: 1174.44,
        chaveNfe: null,
      },
      item: {
        nIdItem: 10,
        nIdProduto: 500,
        cCodigoProduto: 'DET-001',
        cDescricaoProduto: 'Detergente',
        cUnidadeNfe: 'UN',
        nQtdeNfe: 4,
        nPrecoUnit: 25,
        vTotalItem: 100,
        cIgnorarItem: 'N',
        cfopEntrada: '1.556',
        ncm: '34029039',
        categoriaItem: null,
      },
      infoAdicionais: { cCategCompra: '2.01.01' },
      categoriaCompraCodigo: '2.01.01',
      categoriaCompraDescricao: 'Compras de Mercadorias para Revenda',
    });

    expect(result).toMatchObject({
      fornecedorRazaoSocial: 'CLEAN MIX PROD DE HIG E LIMP LTDA',
      cfopEntrada: '1.556',
      ncmProduto: '34029039',
      categoriaCompraCodigo: '2.01.01',
      categoriaCompraDescricao: 'Compras de Mercadorias para Revenda',
      dataEmissaoNf: '2026-06-22',
    });
  });

  it('indexa itens por nIdItem', () => {
    const map = indexarItensRecebimentoPorIdItem([
      {
        nIdItem: 10,
        nIdProduto: 1,
        cCodigoProduto: 'A',
        cDescricaoProduto: 'A',
        cUnidadeNfe: 'UN',
        nQtdeNfe: 1,
        nPrecoUnit: 1,
        vTotalItem: 1,
        cIgnorarItem: 'N',
        cfopEntrada: null,
        ncm: null,
        categoriaItem: null,
      },
    ]);

    expect(map.get(10)?.cCodigoProduto).toBe('A');
  });
});
