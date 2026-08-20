import { describe, expect, it } from 'vitest';

import { buildEmbalagemWorklistData } from './embalagem-etapa-adapter';
import type { PainelLoteEmbalagem, PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';

function loteBase(overrides: Partial<PainelLoteEmbalagem> = {}): PainelLoteEmbalagem {
  return {
    loteId: 'l1',
    modo: 'parcial',
    quantidade: { caixas: 10, pacotes: 0, unidades: 0, kg: 0 },
    produzidoEm: '2026-06-18T12:00:00Z',
    congelado: 'Não',
    ...overrides,
  };
}

function pedidoBase(
  overrides: Partial<PainelPedidoEmbalagem> = {},
): PainelPedidoEmbalagem {
  return {
    pedidoEmbalagemId: 'ped-1',
    ordemPlanejamento: 1,
    cliente: 'Valepan',
    produto: 'HB Brioche 65g',
    observacao: '',
    dataPedido: '2026-06-18',
    dataFabricacao: '2026-06-19',
    pedido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
    produzido: { caixas: 10, pacotes: 0, unidades: 0, kg: 0 },
    unidade: 'cx',
    aProduzir: 100,
    produzidoScalar: 10,
    metaPlanejada: 100,
    metaEfetiva: 100,
    finalizada: false,
    possuiEtiqueta: true,
    lotes: [loteBase()],
    ...overrides,
  };
}

function buildWorklist(pedidos: PainelPedidoEmbalagem[]) {
  return buildEmbalagemWorklistData({
    naoFinalizados: pedidos.filter((pedido) => !pedido.finalizada),
    finalizados: pedidos.filter((pedido) => pedido.finalizada),
    pedidos,
    selectedDate: '2026-06-18',
    loadingCardId: null,
    deletingLoteId: null,
  });
}

describe('buildEmbalagemWorklistData', () => {
  it('define turnoLabel T1 quando o lote tem turno 1', () => {
    const worklist = buildWorklist([
      pedidoBase({ lotes: [loteBase({ turno: 1 })] }),
    ]);

    expect(worklist.gruposAtivos[0]?.products[0]?.lotes[0]?.turnoLabel).toBe('T1');
  });

  it('omite turnoLabel quando o lote não tem turno', () => {
    const worklist = buildWorklist([
      pedidoBase({ lotes: [loteBase({ turno: null })] }),
    ]);

    expect(worklist.gruposAtivos[0]?.products[0]?.lotes[0]?.turnoLabel).toBeUndefined();
  });
});
