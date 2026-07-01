import { describe, expect, it } from 'vitest';
import {
  corrigirEntradaComFatorEmbalagem,
  isEntradaSemFatorEmbalagem,
  recalcularEntradaComFator,
  resolverFatorConversaoEntrada,
} from './insumo-entrada-fator';

describe('resolverFatorConversaoEntrada', () => {
  it('prioriza fator do mapeamento quando existir', () => {
    expect(resolverFatorConversaoEntrada(1, 25)).toBe(25);
  });

  it('usa fator informado quando não há mapeamento', () => {
    expect(resolverFatorConversaoEntrada(25, null)).toBe(25);
  });
});

describe('isEntradaSemFatorEmbalagem', () => {
  it('detecta entrada em saco registrada sem fator', () => {
    expect(
      isEntradaSemFatorEmbalagem({
        deltaQuantidade: 857,
        custoUnitario: 61.95,
        quantidadeNf: 857,
        valorTotalItem: 53091.15,
        precoUnitNf: 61.95,
        unidadeNf: 'S2',
        fatorConversao: 25,
      }),
    ).toBe(true);
  });

  it('ignora entradas já convertidas corretamente', () => {
    expect(
      isEntradaSemFatorEmbalagem({
        deltaQuantidade: 1625,
        custoUnitario: 2.436,
        quantidadeNf: 65,
        valorTotalItem: 3958.5,
        precoUnitNf: 60.9,
        unidadeNf: 'SC',
        fatorConversao: 25,
      }),
    ).toBe(false);
  });

  it('ignora NF já em kg mesmo com fator cadastrado', () => {
    expect(
      isEntradaSemFatorEmbalagem({
        deltaQuantidade: 25,
        custoUnitario: 20,
        quantidadeNf: 25,
        valorTotalItem: 500,
        precoUnitNf: 20,
        unidadeNf: 'KG',
        fatorConversao: 25,
      }),
    ).toBe(false);
  });
});

describe('recalcularEntradaComFator', () => {
  it('recalcula entrada a partir dos dados da NF com fator novo', () => {
    const recalc = recalcularEntradaComFator(
      {
        quantidadeNf: 5,
        valorTotalItem: 3000,
        precoUnitNf: 600,
        unidadeNf: 'FD',
      },
      10,
    );

    expect(recalc.deltaQuantidade).toBe(50);
    expect(recalc.custoUnitario).toBe(60);
  });
});

describe('corrigirEntradaComFatorEmbalagem', () => {
  it('divide preço do saco pelo fator via quantidade convertida', () => {
    const corrigido = corrigirEntradaComFatorEmbalagem({
      deltaQuantidade: 39,
      custoUnitario: 61.95,
      quantidadeNf: 39,
      valorTotalItem: 2416.05,
      precoUnitNf: 61.95,
      unidadeNf: 'S2',
      fatorConversao: 25,
    });

    expect(corrigido.deltaQuantidade).toBe(975);
    expect(corrigido.custoUnitario).toBeCloseTo(2.478, 3);
  });
});
