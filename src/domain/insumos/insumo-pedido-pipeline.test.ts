import { describe, expect, it } from 'vitest';
import type { InsumoPedidoPipelineItem } from './insumo-pedido-compra-types';
import { InsumoPedidoPipelineAgrupador } from './insumo-pedido-pipeline';

const agrupador = new InsumoPedidoPipelineAgrupador();

function item(
  overrides: Partial<InsumoPedidoPipelineItem> &
    Pick<InsumoPedidoPipelineItem, 'insumoId' | 'pedidoId'>,
): InsumoPedidoPipelineItem {
  return {
    numero: 1,
    quantidade: 10,
    dataPrevista: '2026-09-10',
    dataEfetiva: '2026-09-10',
    atrasado: false,
    ...overrides,
  };
}

describe('InsumoPedidoPipelineAgrupador', () => {
  it('sem itens → map vazio', () => {
    expect(agrupador.agrupar([])).toEqual(new Map());
  });

  it('um aberto futuro → atrasado false, proximaData = prevista, qtd somada', () => {
    const map = agrupador.agrupar([
      item({
        insumoId: 'ins-1',
        pedidoId: 'ped-1',
        quantidade: 40,
        dataPrevista: '2026-09-15',
        dataEfetiva: '2026-09-15',
        atrasado: false,
      }),
    ]);

    expect(map.size).toBe(1);
    expect(map.get('ins-1')).toEqual({
      quantidade: 40,
      atrasado: false,
      proximaData: '2026-09-15',
      pedidoIds: ['ped-1'],
    });
  });

  it('atrasado + futuro no mesmo insumo → atrasado true, soma qtd e pedidoIds', () => {
    const map = agrupador.agrupar([
      item({
        insumoId: 'ins-1',
        pedidoId: 'ped-atrasado',
        numero: 1,
        quantidade: 20,
        dataPrevista: '2026-08-20',
        dataEfetiva: '2026-08-31',
        atrasado: true,
      }),
      item({
        insumoId: 'ins-1',
        pedidoId: 'ped-futuro',
        numero: 2,
        quantidade: 30,
        dataPrevista: '2026-09-10',
        dataEfetiva: '2026-09-10',
        atrasado: false,
      }),
    ]);

    expect(map.get('ins-1')).toEqual({
      quantidade: 50,
      atrasado: true,
      proximaData: '2026-08-20',
      pedidoIds: ['ped-atrasado', 'ped-futuro'],
    });
  });

  it('insumos diferentes → chaves separadas', () => {
    const map = agrupador.agrupar([
      item({
        insumoId: 'ins-a',
        pedidoId: 'ped-a',
        quantidade: 5,
        dataPrevista: '2026-09-01',
      }),
      item({
        insumoId: 'ins-b',
        pedidoId: 'ped-b',
        quantidade: 8,
        dataPrevista: '2026-09-05',
      }),
    ]);

    expect(map.size).toBe(2);
    expect(map.get('ins-a')?.pedidoIds).toEqual(['ped-a']);
    expect(map.get('ins-b')?.pedidoIds).toEqual(['ped-b']);
    expect(map.get('ins-a')?.quantidade).toBe(5);
    expect(map.get('ins-b')?.quantidade).toBe(8);
  });
});
