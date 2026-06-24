import { describe, expect, it } from 'vitest';
import { normalizarConsultarRecebimento } from './omie-recebimento-normalizer';

describe('normalizarConsultarRecebimento', () => {
  it('extrai cabec enriquecido e itens de itensRecebimento', () => {
    const result = normalizarConsultarRecebimento({
      cabec: {
        cNumeroNFe: '000423283',
        dEmissaoNFe: '22/06/2026',
        cRazaoSocial: 'CLEAN MIX PROD DE HIG E LIMP LTDA',
        cNome: 'CLEAN MIX',
        cCNPJ_CPF: '11.725.898/0001-81',
        cNaturezaOperacao: 'VENDA NO ESTADO',
        nValorNFe: 1174.44,
        cChaveNFe: '33260611725898000181550010004232831903920799',
      },
      itensRecebimento: [
        {
          itensAjustes: { cCFOPEntrada: '1.556' },
          itensCabec: {
            nIdItem: 10,
            nIdProduto: 500,
            cCodigoProduto: 'DET-001',
            cDescricaoProduto: 'Detergente neutro',
            cUnidadeNfe: 'UN',
            nQtdeNFe: 4,
            nPrecoUnit: 25,
            vTotalItem: 100,
            cIgnorarItem: 'N',
            cNCM: '34029039',
          },
        },
      ],
    });

    expect(result.cabec).toMatchObject({
      cNumeroNF: '000423283',
      dDataEmissao: '22/06/2026',
      fornecedorRazaoSocial: 'CLEAN MIX PROD DE HIG E LIMP LTDA',
      fornecedorNome: 'CLEAN MIX',
      naturezaOperacao: 'VENDA NO ESTADO',
      valorTotalNf: 1174.44,
    });
    expect(result.itensCabec).toHaveLength(1);
    expect(result.itensCabec[0]).toMatchObject({
      nQtdeNfe: 4,
      cfopEntrada: '1.556',
      ncm: '34029039',
    });
  });
});
