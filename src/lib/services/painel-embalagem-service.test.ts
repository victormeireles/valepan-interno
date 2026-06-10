import { describe, expect, it } from 'vitest';
import { buildPainelPedido, mapLoteToPainel } from '@/domain/embalagem/painel-pedido-builder';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';

const basePedido: PedidoEmbalagemRecord = {
  id: 'ped-1',
  createdAt: '2026-06-03T10:00:00Z',
  updatedAt: '2026-06-03T10:00:00Z',
  dataProducao: '2026-06-03',
  dataFabricacaoEtiqueta: '2026-06-04',
  tipoEstoqueId: 'tipo-1',
  produtoId: 'prod-1',
  observacao: 'Damiao',
  assadeiraId: 'assadeira-1',
  assadeiras: 15,
  ordemPlanejamento: 1,
  quantidade: { caixas: 225, pacotes: 0, unidades: 0, kg: 0 },
};

function makeLote(id: string, caixas: number): EmbalagemLoteRecord {
  return {
    id,
    createdAt: '2026-06-03T12:00:00Z',
    modo: 'parcial',
    dataPedido: '2026-06-03',
    dataFabricacao: '2026-06-04',
    tipoEstoqueId: 'tipo-1',
    produtoId: 'prod-1',
    congelado: 'Não',
    quantidade: { caixas, pacotes: 0, unidades: 0, kg: 0 },
    produzidoEm: '2026-06-03T12:56:00Z',
  };
}

describe('buildPainelPedido', () => {
  it('agrega produzido como SUM dos lotes', () => {
    const lotes = [makeLote('l1', 50), makeLote('l2', 3)];
    const painel = buildPainelPedido(basePedido, 'HB', 'Brioche 65g', lotes, true, 'Não');

    expect(painel.produzido.caixas).toBe(53);
    expect(painel.produzidoScalar).toBe(53);
    expect(painel.aProduzir).toBe(225);
    expect(painel.lotes).toHaveLength(2);
  });

  it('retorna produzido zero quando não há lotes', () => {
    const painel = buildPainelPedido(basePedido, 'HB', 'Brioche 65g', [], false, 'Não');

    expect(painel.produzido.caixas).toBe(0);
    expect(painel.produzidoScalar).toBe(0);
    expect(painel.lotes).toEqual([]);
  });

  it('deriva lote da data de fabricação da etiqueta', () => {
    const painel = buildPainelPedido(basePedido, 'HB', 'Brioche 65g', [], true, 'Não');

    expect(painel.lote).toBe(155);
  });

  it('usa congelado vindo do tipo de estoque', () => {
    const lotes = [{ ...makeLote('l1', 50), congelado: 'Não' as const }];
    const painel = buildPainelPedido(basePedido, 'HB', 'Brioche 65g', lotes, true, 'Sim');

    expect(painel.congelado).toBe('Sim');
  });
});

describe('mapLoteToPainel', () => {
  it('mapeia campos do lote', () => {
    const lote = makeLote('l1', 50);
    const mapped = mapLoteToPainel(lote, 'Sim');

    expect(mapped.loteId).toBe('l1');
    expect(mapped.quantidade.caixas).toBe(50);
  });
});
