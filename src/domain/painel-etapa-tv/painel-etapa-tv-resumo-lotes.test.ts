import { describe, expect, it } from 'vitest';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { PainelEtapaTvResumoLotes } from './painel-etapa-tv-resumo-lotes';

function ordem(overrides: Partial<PainelOrdemEtapa> = {}): PainelOrdemEtapa {
  return {
    ordemProducaoId: 'op-hb',
    ordemPlanejamento: 1,
    produto: 'HB',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-09-02',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 10, unidades: 0 },
    produzidoBreakdown: { assadeiras: 10, unidades: 0 },
    unidade: 'lt',
    aProduzir: 10,
    produzido: 10,
    metaPlanejada: 10,
    metaEfetiva: 10,
    metaReferencia: 10,
    finalizada: false,
    lotes: [
      {
        loteId: 'l1',
        modo: 'parcial',
        assadeiras: 10,
        unidades: 240,
        produzidoEm: '2026-09-02T10:00:00-03:00',
      },
    ],
    incluirNosTotais: true,
    ...overrides,
  };
}

describe('PainelEtapaTvResumoLotes', () => {
  it('ferm/forno ignora OP un e incluirNosTotais false', () => {
    const lotes = PainelEtapaTvResumoLotes.fromCarga('forno', [
      ordem(),
      ordem({
        ordemProducaoId: 'op-broa',
        unidade: 'un',
        incluirNosTotais: false,
        lotes: [
          {
            loteId: 'l-broa',
            modo: 'parcial',
            assadeiras: 99,
            unidades: 99,
            produzidoEm: '2026-09-02T11:00:00-03:00',
          },
        ],
      }),
    ], []);

    expect(lotes).toEqual([
      { produzidoEm: '2026-09-02T10:00:00-03:00', volume: 10 },
    ]);
  });

  it('embalagem usa caixas dos pedidos em CX/PCT', () => {
    const pedidoCx = {
      pedidoEmbalagemId: 'pe-1',
      ordemPlanejamento: 1,
      cliente: 'A',
      produto: 'HB',
      observacao: '',
      dataPedido: '2026-09-02',
      dataFabricacao: '2026-09-02',
      pedido: { caixas: 20, pacotes: 0, unidades: 0, kg: 0 },
      produzido: { caixas: 8, pacotes: 0, unidades: 0, kg: 0 },
      unidade: 'cx',
      aProduzir: 20,
      produzidoScalar: 8,
      metaPlanejada: 20,
      metaEfetiva: 20,
      finalizada: false,
      possuiEtiqueta: false,
      lotes: [
        {
          loteId: 'le-1',
          modo: 'parcial',
          quantidade: { caixas: 8, pacotes: 0, unidades: 0, kg: 0 },
          produzidoEm: '2026-09-02T09:00:00-03:00',
          congelado: 'Não',
        },
      ],
    } as PainelPedidoEmbalagem;

    const pedidoUn = {
      ...pedidoCx,
      pedidoEmbalagemId: 'pe-un',
      pedido: { caixas: 0, pacotes: 0, unidades: 50, kg: 0 },
      produzido: { caixas: 0, pacotes: 0, unidades: 50, kg: 0 },
      unidade: 'un',
      lotes: [
        {
          loteId: 'le-un',
          modo: 'parcial',
          quantidade: { caixas: 0, pacotes: 0, unidades: 50, kg: 0 },
          produzidoEm: '2026-09-02T09:30:00-03:00',
          congelado: 'Não',
        },
      ],
    } as PainelPedidoEmbalagem;

    expect(PainelEtapaTvResumoLotes.fromCarga('embalagem', [], [pedidoCx, pedidoUn])).toEqual([
      { produzidoEm: '2026-09-02T09:00:00-03:00', volume: 8 },
    ]);
  });
});
