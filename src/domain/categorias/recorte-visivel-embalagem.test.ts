import { describe, expect, it } from 'vitest';

import {
  RecorteVisivelEmbalagem,
  produtoNomesVisiveisDe,
} from './recorte-visivel-embalagem';

const CAT_HAMB = 'cat-hamb';
const CAT_BROA = 'cat-broa';

const recorte = new RecorteVisivelEmbalagem(
  new Map([
    ['prod-hb', CAT_HAMB],
    ['prod-broa', CAT_BROA],
    ['prod-pao', CAT_BROA],
  ]),
  new Set([CAT_HAMB]),
);

describe('RecorteVisivelEmbalagem', () => {
  it('meta/realizado só entram OPs hamb/hot, não Broa nem pão', () => {
    const ids = recorte.ordemIdsVisiveis([
      { id: 'op-hb', produtoId: 'prod-hb' },
      { id: 'op-broa', produtoId: 'prod-broa' },
      { id: 'op-pao', produtoId: 'prod-pao' },
    ]);
    expect([...ids]).toEqual(['op-hb']);
  });

  it('hora 11-12 descarta lote de Broa e mantém as latas da OP visível', () => {
    const visiveis = new Set(['op-hb']);
    const lotes = recorte.lotesPorOrdem(
      [
        { ordemProducaoId: 'op-hb', assadeiras: 120 },
        { ordemProducaoId: 'op-broa', assadeiras: 0, unidades: 2472 },
      ],
      visiveis,
    );
    expect(lotes).toEqual([{ ordemProducaoId: 'op-hb', assadeiras: 120 }]);
  });

  it('embalagem filtra lote pelo produto, não pela OP do dia', () => {
    const lotes = recorte.lotesPorProduto([
      { produtoId: 'prod-hb', caixas: 10 },
      { produtoId: 'prod-broa', caixas: 4 },
    ]);
    expect(lotes).toEqual([{ produtoId: 'prod-hb', caixas: 10 }]);
  });
});

describe('produtoNomesVisiveisDe', () => {
  it('só nomes de categoria visível', () => {
    const nomes = produtoNomesVisiveisDe(
      [
        { nome: 'HB Brioche', categoriaId: CAT_HAMB },
        { nome: 'Broa', categoriaId: CAT_BROA },
      ],
      new Set([CAT_HAMB]),
    );
    expect([...nomes]).toEqual(['HB Brioche']);
  });
});
