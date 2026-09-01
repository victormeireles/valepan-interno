import { describe, expect, it } from 'vitest';
import { PainelEtapaTvProximasOpsPicker } from './painel-etapa-tv-proximas-ops-picker';
import type { PainelEtapaTvOpFonte } from './painel-etapa-tv-types';

function op(over: Partial<PainelEtapaTvOpFonte>): PainelEtapaTvOpFonte {
  return {
    ordemId: 'a',
    ordemPlanejamento: 1,
    finalizada: false,
    produzido: 0,
    ...over,
  };
}

describe('PainelEtapaTvProximasOpsPicker', () => {
  it('vazio se todas finalizadas', () => {
    expect(
      PainelEtapaTvProximasOpsPicker.pick(
        [op({ ordemId: 'x', finalizada: true, produzido: 10 })],
        null,
      ),
    ).toEqual([]);
  });

  it('parciais na frente das pendentes, respeitando planejamento', () => {
    const got = PainelEtapaTvProximasOpsPicker.pick(
      [
        op({ ordemId: 'p1', ordemPlanejamento: 1, produzido: 0 }),
        op({ ordemId: 'a1', ordemPlanejamento: 2, produzido: 5 }),
        op({ ordemId: 'p2', ordemPlanejamento: 3, produzido: 0 }),
        op({ ordemId: 'a2', ordemPlanejamento: 4, produzido: 1 }),
      ],
      null,
    );
    expect(got.map((item) => item.ordemId)).toEqual(['a1', 'a2', 'p1']);
  });

  it('exclui a OP do último lote e não puxa finalizada para completar', () => {
    const got = PainelEtapaTvProximasOpsPicker.pick(
      [
        op({ ordemId: 'last', ordemPlanejamento: 1, produzido: 8 }),
        op({ ordemId: 'n1', ordemPlanejamento: 2, produzido: 0 }),
        op({ ordemId: 'done', ordemPlanejamento: 3, finalizada: true, produzido: 9 }),
      ],
      'last',
    );
    expect(got.map((item) => item.ordemId)).toEqual(['n1']);
  });
});
