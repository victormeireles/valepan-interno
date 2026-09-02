import { describe, expect, it } from 'vitest';

import {
  isOrdemContaAssadeirasDashboard,
  lotesDaDataOp,
  lotesToDashboardSnapshots,
  ordensToDashboardItems,
  ordensToDashboardSnapshots,
} from './painel-dashboard-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

function ordem(overrides: Partial<PainelOrdemEtapa> = {}): PainelOrdemEtapa {
  return {
    ordemProducaoId: 'op-1',
    ordemPlanejamento: 1,
    produto: 'HB Brioche',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-06-18',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 10, unidades: 0 },
    produzidoBreakdown: { assadeiras: 5, unidades: 0 },
    unidade: 'lt',
    aProduzir: 10,
    produzido: 5,
    lotes: [
      {
        loteId: 'l1',
        modo: 'parcial',
        assadeiras: 3,
        unidades: 0,
        produzidoEm: '2026-06-18T14:30:00Z',
      },
    ],
    ...overrides,
  };
}

describe('isOrdemContaAssadeirasDashboard', () => {
  it('inclui ordem com assadeiras', () => {
    expect(isOrdemContaAssadeirasDashboard(ordem())).toBe(true);
  });

  it('exclui ordem só unidades', () => {
    expect(
      isOrdemContaAssadeirasDashboard(
        ordem({ modoQuantidade: 'unidades', pedido: { assadeiras: 0, unidades: 100 } }),
      ),
    ).toBe(false);
  });
});

describe('ordensToDashboardSnapshots', () => {
  it('gera meta por ordem e linha por lote elegível', () => {
    const snaps = ordensToDashboardSnapshots([ordem()]);
    expect(snaps).toHaveLength(2);
    expect(snaps[0]).toEqual({ assadeiras: 0, pedidoAssadeiras: 10 });
    expect(snaps[1]).toEqual({
      assadeiras: 3,
      pedidoAssadeiras: 0,
      produzidoEm: '2026-06-18T14:30:00Z',
    });
  });

  it('ignora ordens só unidades', () => {
    expect(
      ordensToDashboardSnapshots([
        ordem({ modoQuantidade: 'unidades', pedido: { assadeiras: 0, unidades: 50 } }),
      ]),
    ).toHaveLength(0);
  });
});

describe('ordensToDashboardItems', () => {
  it('espelha snapshots', () => {
    expect(ordensToDashboardItems([ordem()])).toEqual(ordensToDashboardSnapshots([ordem()]));
  });
});

describe('lotesDaDataOp', () => {
  it('não soma lote de OP de outro dia no produzido do dia (ex. 310 da OP de amanhã)', () => {
    const lotes = [
      { ordemProducaoId: 'op-31', assadeiras: 1, produzidoEm: '2026-08-31T21:06:00-03:00' },
      { ordemProducaoId: 'op-01', assadeiras: 310, produzidoEm: '2026-08-31T22:38:00-03:00' },
    ];
    const dataPorOp = new Map([
      ['op-31', '2026-08-31'],
      ['op-01', '2026-09-01'],
    ]);

    expect(lotesDaDataOp(lotes, dataPorOp, '2026-08-31')).toEqual([lotes[0]]);
  });
});

describe('lotesToDashboardSnapshots', () => {
  it('converte lotes do dia civil, inclusive OP de outro dia', () => {
    const snaps = lotesToDashboardSnapshots([
      {
        loteId: 'l-ontem',
        modo: 'parcial',
        assadeiras: 12,
        unidades: 0,
        produzidoEm: '2026-08-17T10:00:00-03:00',
      },
    ]);
    expect(snaps).toEqual([
      { assadeiras: 12, pedidoAssadeiras: 0, produzidoEm: '2026-08-17T10:00:00-03:00' },
    ]);
  });

  it('ignora lote sem assadeiras', () => {
    expect(
      lotesToDashboardSnapshots([
        {
          loteId: 'l-un',
          modo: 'parcial',
          assadeiras: 0,
          unidades: 240,
          produzidoEm: '2026-08-17T10:00:00-03:00',
        },
      ]),
    ).toEqual([]);
  });
});
