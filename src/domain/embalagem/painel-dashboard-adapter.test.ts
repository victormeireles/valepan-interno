import { describe, expect, it } from 'vitest';
import {
  pedidosToDashboardItems,
  pedidosToDashboardSnapshots,
} from '@/domain/embalagem/painel-dashboard-adapter';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';

const pedido: PainelPedidoEmbalagem = {
  pedidoEmbalagemId: 'p1',
  ordemPlanejamento: 1,
  cliente: 'HB',
  produto: 'Brioche',
  observacao: '',
  dataPedido: '2026-06-05',
  dataFabricacao: '2026-06-06',
  pedido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
  produzido: { caixas: 50, pacotes: 0, unidades: 0, kg: 0 },
  unidade: 'cx',
  aProduzir: 100,
  produzidoScalar: 50,
  possuiEtiqueta: true,
  lotes: [
    {
      loteId: 'l1',
      modo: 'parcial',
      quantidade: { caixas: 50, pacotes: 0, unidades: 0, kg: 0 },
      produzidoEm: '2026-06-05T15:56:00Z',
      congelado: 'Não',
    },
  ],
  producaoUpdatedAt: '2026-06-05T15:56:00Z',
};

describe('pedidosToDashboardSnapshots', () => {
  it('emite meta do pedido e caixas por lote sem URLs de foto', () => {
    const snapshots = pedidosToDashboardSnapshots([pedido]);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toEqual({
      caixas: 0,
      pacotes: 0,
      pedidoCaixas: 100,
      pedidoPacotes: 0,
      producaoUpdatedAt: '2026-06-05T15:56:00Z',
    });
    expect(snapshots[1]).toEqual({
      caixas: 50,
      pacotes: 0,
      pedidoCaixas: 0,
      pedidoPacotes: 0,
      producaoUpdatedAt: '2026-06-05T15:56:00Z',
    });
    expect(snapshots[1]).not.toHaveProperty('pacoteFotoUrl');
  });
});

describe('pedidosToDashboardItems', () => {
  it('continua incluindo cliente/produto para UI', () => {
    const items = pedidosToDashboardItems([pedido]);
    expect(items[0].cliente).toBe('HB');
    expect(items[1].caixas).toBe(50);
  });

  it('ignora pedidos medidos só em unidades', () => {
    const pedidoUn: PainelPedidoEmbalagem = {
      ...pedido,
      pedido: { caixas: 0, pacotes: 0, unidades: 1000, kg: 0 },
      produzido: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
      unidade: 'un',
      aProduzir: 1000,
      produzidoScalar: 0,
      lotes: [],
    };
    expect(pedidosToDashboardItems([pedidoUn])).toHaveLength(0);
    expect(pedidosToDashboardSnapshots([pedidoUn])).toHaveLength(0);
  });
});
