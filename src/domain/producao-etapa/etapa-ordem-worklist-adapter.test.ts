import { describe, expect, it } from 'vitest';

import { buildEtapaOrdemWorklistData } from './etapa-ordem-worklist-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

function ordemBase(overrides: Partial<PainelOrdemEtapa> = {}): PainelOrdemEtapa {
  return {
    ordemProducaoId: 'ordem-1',
    ordemPlanejamento: 1,
    produto: 'HB Brioche 65g',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-06-18',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 40, unidades: 0 },
    produzidoBreakdown: { assadeiras: 0, unidades: 0 },
    unidade: 'lt',
    aProduzir: 40,
    produzido: 0,
    metaPlanejada: 40,
    metaEfetiva: 40,
    metaReferencia: 40,
    finalizada: false,
    assadeiraNome: '24',
    temMultiplasAssadeirasCadastradas: false,
    lotes: [],
    ...overrides,
  };
}

function buildWorklist(ordens: PainelOrdemEtapa[]) {
  return buildEtapaOrdemWorklistData({
    etapa: 'fermentacao',
    naoFinalizados: ordens.filter((ordem) => !ordem.finalizada),
    finalizados: ordens.filter((ordem) => ordem.finalizada),
    ordens,
    selectedDate: '2026-06-18',
    loadingCardId: null,
    deletingLoteId: null,
    creatingLoteOrdemId: null,
  });
}

describe('buildEtapaOrdemWorklistData', () => {
  it('exibe a observação da OP no card de fermentação e forno', () => {
    const worklist = buildWorklist([
      ordemBase({ observacao: '  lata nova  ' }),
    ]);

    expect(worklist.gruposAtivos[0]?.products[0]?.observacao).toBe('lata nova');
  });

  it('omite observação vazia no card', () => {
    const worklist = buildWorklist([ordemBase({ observacao: '   ' })]);

    expect(worklist.gruposAtivos[0]?.products[0]?.observacao).toBeUndefined();
  });

  it('omite a assadeira quando o produto tem só uma opção cadastrada', () => {
    const worklist = buildWorklist([
      ordemBase({
        assadeiraNome: '24',
        temMultiplasAssadeirasCadastradas: false,
      }),
    ]);

    expect(worklist.gruposAtivos[0]?.products[0]?.assadeira).toBeUndefined();
  });

  it('exibe a assadeira quando o produto tem mais de uma opção cadastrada', () => {
    const worklist = buildWorklist([
      ordemBase({
        assadeiraNome: '24',
        temMultiplasAssadeirasCadastradas: true,
      }),
    ]);

    expect(worklist.gruposAtivos[0]?.products[0]?.assadeira).toBe('24');
  });

  it('propaga a cor cadastrada da assadeira no badge', () => {
    const worklist = buildWorklist([
      ordemBase({
        assadeiraNome: '24',
        assadeiraCorHex: '#6B7233',
        temMultiplasAssadeirasCadastradas: true,
      }),
    ]);

    expect(worklist.gruposAtivos[0]?.products[0]?.assadeiraCorHex).toBe('#6B7233');
  });
});
