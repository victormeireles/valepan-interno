import { describe, expect, it } from 'vitest';

import { buildEmbalagemToolbarMetrics } from './build-embalagem-toolbar-metrics';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';

function pedidoBase(
  overrides: Partial<PainelPedidoEmbalagem> = {},
): PainelPedidoEmbalagem {
  return {
    pedidoEmbalagemId: 'pedido-1',
    ordemPlanejamento: 1,
    cliente: 'Cliente A',
    produto: 'HB Brioche 65g',
    observacao: '',
    dataPedido: '2026-06-18',
    dataFabricacao: '2026-06-18',
    pedido: { caixas: 350, pacotes: 0, unidades: 0, kg: 0 },
    produzido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
    unidade: 'cx',
    aProduzir: 325,
    produzidoScalar: 100,
    metaPlanejada: 350,
    metaEfetiva: 325,
    finalizada: false,
    possuiEtiqueta: true,
    lotes: [],
    ...overrides,
  };
}

describe('buildEmbalagemToolbarMetrics', () => {
  it('usa metaEfetiva e ignora pedidos sem caixas/pacotes', () => {
    const metrics = buildEmbalagemToolbarMetrics([
      pedidoBase(),
      pedidoBase({
        pedidoEmbalagemId: 'pedido-un',
        pedido: { caixas: 0, pacotes: 0, unidades: 500, kg: 0 },
        produzido: { caixas: 0, pacotes: 0, unidades: 100, kg: 0 },
        metaEfetiva: 500,
        metaPlanejada: 500,
      }),
    ]);

    expect(metrics.produzido).toBe(100);
    expect(metrics.meta).toBe(325);
    expect(metrics.falta).toBe(225);
    expect(metrics.toolbarSecondaryLabel).toBe('OP: 350 CX');
  });

  it('omite OP informativa quando planejada coincide com efetiva', () => {
    const metrics = buildEmbalagemToolbarMetrics([
      pedidoBase({ metaEfetiva: 350, metaPlanejada: 350 }),
    ]);

    expect(metrics.toolbarSecondaryLabel).toBeUndefined();
  });
});
