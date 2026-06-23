import { describe, expect, it } from 'vitest';

import { buildOrdensEtapaToolbarMetrics } from './build-etapa-toolbar-metrics';
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
    lotes: [],
    ...overrides,
  };
}

describe('buildOrdensEtapaToolbarMetrics', () => {
  it('usa soma de metaEfetiva como meta da toolbar', () => {
    const metrics = buildOrdensEtapaToolbarMetrics(
      [
        ordemBase({ produzido: 100, metaEfetiva: 680, metaPlanejada: 700 }),
        ordemBase({
          ordemProducaoId: 'ordem-2',
          produzido: 50,
          metaEfetiva: 120,
          metaPlanejada: 150,
        }),
      ],
      'LT',
    );

    expect(metrics.produzido).toBe(150);
    expect(metrics.meta).toBe(800);
    expect(metrics.falta).toBe(650);
    expect(metrics.progressoPct).toBeCloseTo(18.75);
    expect(metrics.metaAtingida).toBe(false);
  });

  it('expõe OP informativa quando planejada difere da efetiva', () => {
    const metrics = buildOrdensEtapaToolbarMetrics(
      [ordemBase({ metaEfetiva: 680, metaPlanejada: 700, produzido: 0 })],
      'LT',
    );

    expect(metrics.toolbarSecondaryLabel).toBe('OP: 700 LT');
  });

  it('omite OP informativa quando planejada coincide com efetiva', () => {
    const metrics = buildOrdensEtapaToolbarMetrics(
      [ordemBase({ metaEfetiva: 700, metaPlanejada: 700 })],
      'LT',
    );

    expect(metrics.toolbarSecondaryLabel).toBeUndefined();
  });
});
