import { describe, expect, it } from 'vitest';

import {
  buildEtapaDetalhesQuantidade,
  sortOrdensPorPlanejamento,
  splitOrdensPorFinalizacao,
} from './etapa-painel-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

function ordemBase(overrides: Partial<PainelOrdemEtapa> = {}): PainelOrdemEtapa {
  return {
    ordemProducaoId: 'ordem-1',
    ordemPlanejamento: 1,
    produto: 'HB Brioche 65g',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-06-18',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 40, unidades: 0 },
    produzidoBreakdown: { assadeiras: 0, unidades: 0 },
    unidade: 'lt',
    aProduzir: 40,
    produzido: 0,
    lotes: [],
    ...overrides,
  };
}

describe('buildEtapaDetalhesQuantidade', () => {
  it('mostra só latas quando modo é assadeiras', () => {
    expect(
      buildEtapaDetalhesQuantidade(
        { assadeiras: 10, unidades: 240 },
        'assadeiras',
      ),
    ).toEqual([{ quantidade: 10, unidade: 'lt' }]);
  });

  it('mostra só unidades quando modo é unidades', () => {
    expect(
      buildEtapaDetalhesQuantidade(
        { assadeiras: 0, unidades: 500 },
        'unidades',
      ),
    ).toEqual([{ quantidade: 500, unidade: 'un' }]);
  });
});

describe('sortOrdensPorPlanejamento', () => {
  it('ordena ordens pelo número de planejamento', () => {
    const sorted = sortOrdensPorPlanejamento([
      ordemBase({ ordemProducaoId: 'ordem-3', ordemPlanejamento: 3 }),
      ordemBase({ ordemProducaoId: 'ordem-1', ordemPlanejamento: 1 }),
      ordemBase({ ordemProducaoId: 'ordem-2', ordemPlanejamento: 2 }),
    ]);

    expect(sorted.map((ordem) => ordem.ordemProducaoId)).toEqual([
      'ordem-1',
      'ordem-2',
      'ordem-3',
    ]);
  });
});

describe('splitOrdensPorFinalizacao', () => {
  it('mantém ordem de planejamento em cada seção', () => {
    const { naoFinalizados, finalizados } = splitOrdensPorFinalizacao([
      ordemBase({ ordemProducaoId: 'ordem-2', ordemPlanejamento: 2, produzido: 0, aProduzir: 40 }),
      ordemBase({ ordemProducaoId: 'ordem-1', ordemPlanejamento: 1, produzido: 40, aProduzir: 40 }),
      ordemBase({ ordemProducaoId: 'ordem-3', ordemPlanejamento: 3, produzido: 10, aProduzir: 40 }),
    ]);

    expect(naoFinalizados.map((ordem) => ordem.ordemProducaoId)).toEqual(['ordem-2', 'ordem-3']);
    expect(finalizados.map((ordem) => ordem.ordemProducaoId)).toEqual(['ordem-1']);
  });
});
