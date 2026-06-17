import { describe, expect, it } from 'vitest';

import {
  menorOrdemPlanejamento,
  sortPorOrdemPlanejamento,
} from './ordem-planejamento-sort';

describe('sortPorOrdemPlanejamento', () => {
  it('ordena itens pelo número de planejamento', () => {
    const sorted = sortPorOrdemPlanejamento([
      { id: 'c', ordemPlanejamento: 3 },
      { id: 'a', ordemPlanejamento: 1 },
      { id: 'b', ordemPlanejamento: 2 },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('menorOrdemPlanejamento', () => {
  it('retorna o menor valor da lista', () => {
    expect(
      menorOrdemPlanejamento([
        { ordemPlanejamento: 4 },
        { ordemPlanejamento: 2 },
      ]),
    ).toBe(2);
  });
});
