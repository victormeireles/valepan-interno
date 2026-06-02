import { describe, expect, it } from 'vitest';
import {
  deltasPorEtapa,
  etapasPreenchidasPorOrigem,
  origensDisponiveis,
  saldoPorOrigem,
  type VolumesEtapasAdiantar,
} from './adiantar-origens';

// Cenário do usuário: 200 latas, 100 na fermentação, 50 na entrada do forno, massa pronta.
const cenario: VolumesEtapasAdiantar = {
  metaLt: 200,
  fermentacao: 100,
  entradaForno: 50,
  saidaForno: 0,
  entradaEmbalagem: 0,
};

describe('saldoPorOrigem', () => {
  it('calcula o saldo parado por etapa', () => {
    expect(saldoPorOrigem(cenario)).toEqual({
      inicio: 100, // 200 − 100
      fermentacao: 50, // 100 − 50
      entrada_forno: 50, // 50 − 0
      saida_forno: 0, // 0 − 0
    });
  });

  it('nunca devolve negativo', () => {
    const s = saldoPorOrigem({
      metaLt: 50,
      fermentacao: 100,
      entradaForno: 0,
      saidaForno: 0,
      entradaEmbalagem: 0,
    });
    expect(s.inicio).toBe(0);
  });
});

describe('origensDisponiveis', () => {
  it('na saída de embalagem lista início, fermentação e entrada do forno (com saldo > 0)', () => {
    const r = origensDisponiveis(cenario, 'saida_embalagem');
    expect(r).toEqual([
      { origem: 'inicio', saldo: 100 },
      { origem: 'fermentacao', saldo: 50 },
      { origem: 'entrada_forno', saldo: 50 },
    ]);
  });

  it('na saída do forno só aceita origens antes da entrada do forno', () => {
    const r = origensDisponiveis(cenario, 'saida_forno');
    // cartStage = entrada_forno → origens válidas: inicio, fermentacao
    expect(r.map((o) => o.origem)).toEqual(['inicio', 'fermentacao']);
  });

  it('na entrada do forno só aceita início', () => {
    const r = origensDisponiveis(cenario, 'entrada_forno');
    expect(r.map((o) => o.origem)).toEqual(['inicio']);
  });
});

describe('etapasPreenchidasPorOrigem', () => {
  it('início preenche tudo até a etapa-fonte', () => {
    expect(etapasPreenchidasPorOrigem('inicio', 'saida_embalagem')).toEqual([
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
    ]);
  });

  it('fermentação preenche da entrada do forno em diante', () => {
    expect(etapasPreenchidasPorOrigem('fermentacao', 'saida_embalagem')).toEqual([
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
    ]);
  });

  it('saída do forno preenche só a entrada da embalagem', () => {
    expect(etapasPreenchidasPorOrigem('saida_forno', 'saida_embalagem')).toEqual([
      'entrada_embalagem',
    ]);
  });
});

describe('deltasPorEtapa', () => {
  it('soma os deltas de múltiplas origens por etapa', () => {
    const d = deltasPorEtapa(
      [
        { origem: 'inicio', latas: 30 },
        { origem: 'fermentacao', latas: 50 },
        { origem: 'entrada_forno', latas: 50 },
      ],
      'saida_embalagem',
    );
    expect(d).toEqual({
      fermentacao: 30, // só início
      entrada_forno: 30 + 50, // início + fermentação
      saida_forno: 30 + 50 + 50, // todas
      entrada_embalagem: 30 + 50 + 50, // todas
    });
  });

  it('ignora quantidades zeradas', () => {
    const d = deltasPorEtapa([{ origem: 'inicio', latas: 0 }], 'saida_embalagem');
    expect(d).toEqual({ fermentacao: 0, entrada_forno: 0, saida_forno: 0, entrada_embalagem: 0 });
  });
});
