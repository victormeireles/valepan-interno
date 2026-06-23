import { describe, expect, it } from 'vitest';

import {
  splitPedidosEmbalagemEmGrupos,
  splitPedidosEmbalagemPorStatus,
} from './embalagem-painel-adapter';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';

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
    produzido: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
    unidade: 'cx',
    aProduzir: 100,
    produzidoScalar: 0,
    possuiEtiqueta: true,
    lotes: [],
    ...overrides,
  };
}

describe('splitPedidosEmbalagemPorStatus', () => {
  it('ordena pedidos pela ordem de planejamento', () => {
    const { naoFinalizados } = splitPedidosEmbalagemPorStatus([
      pedidoBase({ pedidoEmbalagemId: 'ped-3', ordemPlanejamento: 3 }),
      pedidoBase({ pedidoEmbalagemId: 'ped-1', ordemPlanejamento: 1 }),
      pedidoBase({ pedidoEmbalagemId: 'ped-2', ordemPlanejamento: 2 }),
    ]);

    expect(naoFinalizados.map((p) => p.pedidoEmbalagemId)).toEqual([
      'ped-1',
      'ped-2',
      'ped-3',
    ]);
  });

  it('separa finalizados mantendo ordem de planejamento', () => {
    const { finalizados } = splitPedidosEmbalagemPorStatus([
      pedidoBase({
        pedidoEmbalagemId: 'ped-2',
        ordemPlanejamento: 2,
        produzido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
        produzidoScalar: 100,
      }),
      pedidoBase({
        pedidoEmbalagemId: 'ped-1',
        ordemPlanejamento: 1,
        produzido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
        produzidoScalar: 100,
      }),
    ]);

    expect(finalizados.map((p) => p.pedidoEmbalagemId)).toEqual(['ped-1', 'ped-2']);
  });
});

describe('splitPedidosEmbalagemEmGrupos', () => {
  it('ordena pedidos e grupos pela ordem de planejamento', () => {
    const { gruposNaoFinalizados } = splitPedidosEmbalagemEmGrupos(
      [
        pedidoBase({
          pedidoEmbalagemId: 'ped-3',
          ordemPlanejamento: 3,
          cliente: 'Damiao',
        }),
        pedidoBase({
          pedidoEmbalagemId: 'ped-1',
          ordemPlanejamento: 1,
          cliente: 'Valepan',
        }),
        pedidoBase({
          pedidoEmbalagemId: 'ped-2',
          ordemPlanejamento: 2,
          cliente: 'Damiao',
        }),
      ],
      '2026-06-18',
    );

    expect(gruposNaoFinalizados.map((grupo) => grupo.cliente)).toEqual([
      'Valepan',
      'Damiao',
    ]);
    expect(
      gruposNaoFinalizados.flatMap((grupo) =>
        grupo.pedidos.map((pedido) => pedido.pedidoEmbalagemId),
      ),
    ).toEqual(['ped-1', 'ped-2', 'ped-3']);
  });
});
