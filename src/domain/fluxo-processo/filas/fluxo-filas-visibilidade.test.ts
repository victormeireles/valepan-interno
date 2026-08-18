import { describe, expect, it } from 'vitest';
import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import { FluxoFilasVisibilidade } from './fluxo-filas-visibilidade';
import type { FluxoFilasOpInput } from './fluxo-filas-types';

const vis = new FluxoFilasVisibilidade();

function op(id: string, nome: string): FluxoFilasOpInput {
  return {
    id,
    ordemPlanejamento: 1,
    produtoNome: nome,
    assadeiraNome: 'X',
    observacao: '',
    unidades: 100,
    latas: 0,
    caixas: 0,
    dataProducao: '2026-08-12',
  };
}

function ev(
  produtoNome: string,
  ordemProducaoId?: string,
): FluxoControleEventoInput {
  return {
    ordemProducaoId,
    produtoNome,
    assadeiraNome: 'X',
    unidades: 10,
    produzidoEm: '2026-08-12T10:00:00-03:00',
    dataOp: '2026-08-12',
  };
}

describe('FluxoFilasVisibilidade', () => {
  it('exclui OPs e lotes fora de Hambúrguer/Hot Dog', () => {
    const result = vis.restringir({
      ops: [op('op-hamb', 'HB 80g'), op('op-forma', 'Pão de Forma')],
      opsAnteriores: [],
      eventosFerm: [ev('HB 80g', 'op-hamb'), ev('Pão de Forma', 'op-forma')],
      eventosForno: [ev('Pão de Forma', 'op-forma')],
      eventosEmb: [ev('HB 80g'), ev('Pão de Forma')],
      opIdsVisiveis: new Set(['op-hamb']),
      produtoNomesVisiveis: new Set(['HB 80g']),
    });

    expect(result.ops.map((o) => o.id)).toEqual(['op-hamb']);
    expect(result.eventosFerm).toHaveLength(1);
    expect(result.eventosForno).toHaveLength(0);
    expect(result.eventosEmb.map((e) => e.produtoNome)).toEqual(['HB 80g']);
  });

  it('mantém OP extra de produto visível e exclui Pão de Forma', () => {
    const result = vis.restringir({
      ops: [op('op-hamb', 'HB 80g')],
      opsAnteriores: [op('op-extra', 'HB 80g'), op('op-forma', 'Pão de Forma')],
      eventosFerm: [],
      eventosForno: [],
      eventosEmb: [ev('HB 80g', 'op-extra'), ev('Pão de Forma', 'op-forma')],
      opIdsVisiveis: new Set(['op-hamb']),
      produtoNomesVisiveis: new Set(['HB 80g']),
    });

    expect(result.opsAnteriores.map((o) => o.id)).toEqual(['op-extra']);
    expect(result.eventosEmb.map((e) => e.produtoNome)).toEqual(['HB 80g']);
  });
});
