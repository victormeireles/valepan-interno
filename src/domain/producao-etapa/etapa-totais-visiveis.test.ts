import { describe, expect, it } from 'vitest';

import { ordensParaTotaisLt, toolbarMetricsEtapaDiaCivil } from './etapa-totais-visiveis';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

function ordem(overrides: Partial<PainelOrdemEtapa> = {}): PainelOrdemEtapa {
  return {
    ordemProducaoId: 'op-hb',
    ordemPlanejamento: 1,
    produto: 'HB Brioche 65g',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-08-18',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 3321, unidades: 0 },
    produzidoBreakdown: { assadeiras: 2084, unidades: 0 },
    unidade: 'lt',
    aProduzir: 3321,
    produzido: 2084,
    metaPlanejada: 3321,
    metaEfetiva: 3321,
    metaReferencia: 3321,
    finalizada: false,
    lotes: [],
    incluirNosTotais: true,
    ...overrides,
  };
}

describe('ordensParaTotaisLt', () => {
  it('não soma Broa em UN nem pão fora do recorte hamb/hot', () => {
    const visiveis = ordensParaTotaisLt([
      ordem({ produzido: 2084, metaEfetiva: 3321 }),
      ordem({
        ordemProducaoId: 'op-broa',
        produto: 'Broa',
        modoQuantidade: 'unidades',
        unidade: 'un',
        produzido: 2472,
        metaEfetiva: 2467,
        incluirNosTotais: false,
      }),
      ordem({
        ordemProducaoId: 'op-pao',
        produto: 'Pão Francês',
        produzido: 90,
        metaEfetiva: 90,
        incluirNosTotais: false,
      }),
    ]);

    expect(visiveis).toHaveLength(1);
    expect(visiveis[0]?.produzido).toBe(2084);
    expect(visiveis[0]?.metaEfetiva).toBe(3321);
  });
});

describe('toolbarMetricsEtapaDiaCivil', () => {
  it('usa meta da OP visível e produzido do dia civil, sem Broa', () => {
    const metrics = toolbarMetricsEtapaDiaCivil(
      [
        ordem({ produzido: 2500, metaEfetiva: 3321 }),
        ordem({
          ordemProducaoId: 'op-broa',
          unidade: 'un',
          produzido: 2472,
          metaEfetiva: 2467,
          incluirNosTotais: false,
        }),
      ],
      'LT',
      [{ assadeiras: 2084 }, { assadeiras: 0 }],
    );
    expect(metrics.meta).toBe(3321);
    expect(metrics.produzido).toBe(2084);
    expect(metrics.falta).toBe(1237);
  });
});
