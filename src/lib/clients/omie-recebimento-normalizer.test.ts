import { describe, expect, it } from 'vitest';
import { normalizarConsultarRecebimento } from './omie-recebimento-normalizer';

describe('normalizarConsultarRecebimento', () => {
  it('extrai itens de itensRecebimento[].itensCabec', () => {
    const result = normalizarConsultarRecebimento({
      cabec: { cNumeroNFe: '000095383', dEmissaoNFe: '15/06/2026' },
      itensRecebimento: [
        {
          itensCabec: {
            nIdItem: 10,
            nIdProduto: 500,
            cCodigoProduto: 'FAR-001',
            cDescricaoProduto: 'Farinha',
            cUnidadeNfe: 'KG',
            nQtdeNFe: 100,
            nPrecoUnit: 5,
            vTotalItem: 500,
            cIgnorarItem: 'N',
          },
        },
      ],
    });

    expect(result.cabec).toEqual({
      cNumeroNF: '000095383',
      dDataEmissao: '15/06/2026',
    });
    expect(result.itensCabec).toHaveLength(1);
    expect(result.itensCabec[0]?.nQtdeNfe).toBe(100);
  });
});
