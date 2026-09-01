import { describe, expect, it } from 'vitest';
import type { PainelLoteEmbalagem, PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelLoteEtapa, PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { PainelEtapaTvFonteAdapter } from './painel-etapa-tv-fonte-adapter';

function loteOrdem(over: Partial<PainelLoteEtapa> = {}): PainelLoteEtapa {
  return {
    loteId: 'l1',
    modo: 'parcial',
    assadeiras: 12,
    unidades: 0,
    produzidoEm: '2026-09-01T10:00:00-03:00',
    ...over,
  };
}

function ordem(over: Partial<PainelOrdemEtapa> = {}): PainelOrdemEtapa {
  const lotes = over.lotes ?? [
    loteOrdem({ loteId: 'l1', assadeiras: 12 }),
    loteOrdem({
      loteId: 'l2',
      assadeiras: 8,
      produzidoEm: '2026-09-01T11:00:00-03:00',
    }),
  ];
  return {
    ordemProducaoId: 'op-1',
    ordemPlanejamento: 1,
    produto: 'HB Brioche 65g',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-09-01',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 20, unidades: 0 },
    produzidoBreakdown: { assadeiras: 20, unidades: 0 },
    unidade: 'lt',
    aProduzir: 20,
    produzido: 20,
    metaPlanejada: 20,
    metaEfetiva: 20,
    metaReferencia: 20,
    finalizada: false,
    lotes,
    ...over,
  };
}

function lotePedido(over: Partial<PainelLoteEmbalagem> = {}): PainelLoteEmbalagem {
  return {
    loteId: 'el1',
    modo: 'parcial',
    quantidade: { caixas: 6, pacotes: 0, unidades: 0, kg: 0 },
    produzidoEm: '2026-09-01T12:00:00-03:00',
    congelado: 'Não',
    ...over,
  };
}

function pedido(over: Partial<PainelPedidoEmbalagem> = {}): PainelPedidoEmbalagem {
  return {
    pedidoEmbalagemId: 'ped-1',
    ordemPlanejamento: 1,
    cliente: 'Valepan',
    produto: 'HB Brioche 65g',
    observacao: '',
    dataPedido: '2026-09-01',
    dataFabricacao: '2026-09-01',
    pedido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
    produzido: { caixas: 6, pacotes: 0, unidades: 0, kg: 0 },
    unidade: 'cx',
    aProduzir: 100,
    produzidoScalar: 6,
    metaPlanejada: 100,
    metaEfetiva: 100,
    finalizada: false,
    possuiEtiqueta: true,
    lotes: [lotePedido()],
    ...over,
  };
}

describe('PainelEtapaTvFonteAdapter', () => {
  it('fromOrdens: um OP e um lote por linha de lote', () => {
    const { lotes, ops } = PainelEtapaTvFonteAdapter.fromOrdens([ordem()]);
    expect(ops).toEqual([expect.objectContaining({ ordemId: 'op-1', produzido: 20 })]);
    expect(lotes.map((item) => item.quantidade)).toEqual([12, 8]);
  });

  it('fromPedidos: quantidade em caixas e id do pedido', () => {
    const { lotes, ops } = PainelEtapaTvFonteAdapter.fromPedidos([pedido()]);
    expect(ops[0]?.ordemId).toBe('ped-1');
    expect(lotes[0]?.quantidade).toBe(6);
  });
});
