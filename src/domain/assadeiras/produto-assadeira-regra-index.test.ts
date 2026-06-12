import { describe, expect, it } from 'vitest';
import {
  buildRegraAssadeiraIndex,
  countRegraVinculosForProduto,
  resolveRegraVinculosForProduto,
  type RegraAssadeiraRow,
} from './produto-assadeira-regra-index';

const assadeiraAtiva = {
  nome: 'Assadeira 24',
  unidades_por_assadeira: 24,
  ativo: true,
};

function makeRegra(
  overrides: Partial<RegraAssadeiraRow> = {},
): RegraAssadeiraRow {
  return {
    categoria_id: 'cat-1',
    peso_g: 65,
    assadeira_id: 'ass-1',
    unidades_por_assadeira: null,
    assadeiras: assadeiraAtiva,
    ...overrides,
  };
}

describe('produto-assadeira-regra-index', () => {
  it('agrupa regras por categoria e peso', () => {
    const index = buildRegraAssadeiraIndex([
      makeRegra(),
      makeRegra({ assadeira_id: 'ass-2' }),
      makeRegra({ categoria_id: 'cat-2', peso_g: 50 }),
    ]);

    expect(index.get('cat-1:65')).toHaveLength(2);
    expect(index.get('cat-2:50')).toHaveLength(1);
  });

  it('resolve vínculos por unit_weight em gramas', () => {
    const index = buildRegraAssadeiraIndex([makeRegra()]);
    const vinculos = resolveRegraVinculosForProduto(
      {
        categoria_id: 'cat-1',
        unit_weight: 65,
        nome: 'HB Brioche',
      },
      index,
    );

    expect(vinculos).toHaveLength(1);
    expect(vinculos[0]?.origem).toBe('regra');
    expect(vinculos[0]?.unidades_efetivas).toBe(24);
  });

  it('resolve peso a partir do nome quando unit_weight é null', () => {
    const index = buildRegraAssadeiraIndex([makeRegra({ peso_g: 50 })]);
    const count = countRegraVinculosForProduto(
      {
        categoria_id: 'cat-1',
        unit_weight: null,
        nome: 'Pão 50g especial',
      },
      index,
    );

    expect(count).toBe(1);
  });

  it('ignora regras com assadeira inativa', () => {
    const index = buildRegraAssadeiraIndex([
      makeRegra({
        assadeiras: { ...assadeiraAtiva, ativo: false },
      }),
    ]);

    expect(
      countRegraVinculosForProduto(
        {
          categoria_id: 'cat-1',
          unit_weight: 65,
          nome: 'Produto',
        },
        index,
      ),
    ).toBe(0);
  });
});
