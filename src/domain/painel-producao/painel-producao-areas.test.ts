import { describe, expect, it } from 'vitest';

import { progressPctForArea, resolveGargaloAreaId, isAreaProducaoEncerrada } from './painel-producao-areas';
import { statusOfProduct, tetoEmbalagem } from './painel-producao-status';
import type { PainelProducaoAreaView, PainelProducaoProduct } from './painel-producao-types';

function product(partial: Partial<PainelProducaoProduct>): PainelProducaoProduct {
  const base: PainelProducaoProduct = {
    id: 'p1',
    ordemPlanejamento: 1,
    name: 'HB Teste',
    cliente: 'Valepan',
    fermentacaoFinalizada: false,
    fornoFinalizada: false,
    embalagemFinalizada: false,
    ferm: { done: 0, meta: 10, unit: 'lt', fim: null, lotes: [] },
    forno: { done: 0, meta: 10, unit: 'lt', fim: null, lotes: [] },
    emb: { done: 0, meta: 12, unit: 'cx', fim: null, lotes: [] },
  };
  return { ...base, ...partial };
}

describe('statusOfProduct', () => {
  it('retorna aguardando sem fermentação', () => {
    expect(statusOfProduct(product({}))).toBe('aguardando');
  });

  it('retorna fermentando com fermentação parcial', () => {
    expect(statusOfProduct(product({ ferm: { done: 3, meta: 10, unit: 'lt', fim: null, lotes: [] } }))).toBe(
      'fermentando',
    );
  });

  it('retorna concluido quando todas etapas fecham', () => {
    expect(
      statusOfProduct(
        product({
          ferm: { done: 10, meta: 10, unit: 'lt', fim: '10h00', lotes: [] },
          forno: { done: 10, meta: 10, unit: 'lt', fim: '11h00', lotes: [] },
          emb: { done: 12, meta: 12, unit: 'cx', fim: '12h00', lotes: [] },
        }),
      ),
    ).toBe('concluido');
  });

  it('nao mantem fermentando quando a OP de fermentacao foi finalizada', () => {
    expect(
      statusOfProduct(
        product({
          fermentacaoFinalizada: true,
          fornoFinalizada: true,
          ferm: { done: 520, meta: 750, unit: 'lt', fim: null, lotes: [] },
          forno: { done: 520, meta: 520, unit: 'lt', fim: '14h00', lotes: [] },
          emb: { done: 150, meta: 260, unit: 'cx', fim: null, lotes: [] },
        }),
      ),
    ).toBe('embalando');
  });
});

describe('tetoEmbalagem', () => {
  it('limita caixas ao pão assado', () => {
    expect(
      tetoEmbalagem(
        product({
          forno: { done: 8, meta: 10, unit: 'lt', fim: null, lotes: [] },
          emb: { done: 4, meta: 12, unit: 'cx', fim: null, lotes: [] },
        }),
      ),
    ).toBe(9);
  });
});

describe('isAreaProducaoEncerrada', () => {
  it('marca fermentacao encerrada quando todas OPs foram finalizadas', () => {
    expect(
      isAreaProducaoEncerrada('ferm', [
        product({ fermentacaoFinalizada: true, ferm: { done: 520, meta: 750, unit: 'lt', fim: null, lotes: [] } }),
        product({ fermentacaoFinalizada: true, ferm: { done: 390, meta: 410, unit: 'lt', fim: null, lotes: [] } }),
      ]),
    ).toBe(true);
  });

  it('nao marca encerrada com OP de fermentacao ainda aberta', () => {
    expect(
      isAreaProducaoEncerrada('ferm', [
        product({ fermentacaoFinalizada: true, ferm: { done: 520, meta: 750, unit: 'lt', fim: null, lotes: [] } }),
        product({ fermentacaoFinalizada: false, ferm: { done: 20, meta: 50, unit: 'lt', fim: null, lotes: [] } }),
      ]),
    ).toBe(false);
  });
});

describe('resolveGargaloAreaId', () => {
  it('identifica área mais atrasada', () => {
    const areas: PainelProducaoAreaView[] = [
      {
        id: 'ferm',
        name: 'Fermentação',
        icon: 'bakery_dining',
        accent: '#C6A848',
        unit: 'lt',
        done: 80,
        meta: 100,
        ritmo: 10,
        ritmoOntem: 10,
        ritmoSemana: 10,
        janelaIni: '07:00',
        janelaFim: '18:00',
        janela: '7h → 18h',
        producaoEncerrada: false,
      },
      {
        id: 'forno',
        name: 'Forno',
        icon: 'local_fire_department',
        accent: '#C2410C',
        unit: 'lt',
        done: 40,
        meta: 100,
        ritmo: 8,
        ritmoOntem: 8,
        ritmoSemana: 8,
        janelaIni: '07:00',
        janelaFim: '18:00',
        janela: '7h → 18h',
        producaoEncerrada: false,
      },
      {
        id: 'emb',
        name: 'Embalagem',
        icon: 'inventory_2',
        accent: '#9A6B43',
        unit: 'cx',
        done: 90,
        meta: 100,
        ritmo: 20,
        ritmoOntem: 20,
        ritmoSemana: 20,
        janelaIni: '07:00',
        janelaFim: '21:50',
        janela: '7h → 21h50',
        producaoEncerrada: false,
      },
    ];

    expect(resolveGargaloAreaId(areas, 15 * 60 + 10)).toBe('forno');
  });
});

describe('progressPctForArea', () => {
  it('normaliza percentual', () => {
    expect(progressPctForArea({ done: 69, meta: 100 })).toBe(69);
    expect(progressPctForArea({ done: 120, meta: 100 })).toBe(100);
  });
});
