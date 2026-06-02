import { describe, expect, it } from 'vitest';
import {
  chavesIntervaloColuna,
  ordemCellKey,
  somarCelulasSelecionadas,
  totaisOrdemDiariaDia,
} from './ordem-producao-cell-selection';
import type { OrdemProducaoDiariaItemView } from '@/app/actions/producao-actions';

function item(partial: Partial<OrdemProducaoDiariaItemView> & { id: string }): OrdemProducaoDiariaItemView {
  return {
    id: partial.id,
    prioridade: 1,
    produtoId: 'p1',
    produtoNome: 'Pão',
    tipoLata: 'l1',
    latasPlanejadas: partial.latasPlanejadas ?? 0,
    caixasEstimadas: partial.caixasEstimadas ?? 0,
    tipoCaixaEmbalagemId: null,
    tipoCaixaResumo: null,
    clientes: [],
    dataProducaoOverride: null,
    dataEtiquetaOverride: null,
    observacaoEmbalagem: null,
    observacaoProducao: null,
    statusLinha: 'rascunho',
    ordensProducaoId: null,
    loteCodigo: null,
  };
}

describe('ordem-producao-cell-selection', () => {
  it('soma células selecionadas por coluna', () => {
    const items = [
      item({ id: 'a', latasPlanejadas: 10, caixasEstimadas: 5 }),
      item({ id: 'b', latasPlanejadas: 20, caixasEstimadas: 8 }),
    ];
    const selected = new Set([ordemCellKey('a', 'latas'), ordemCellKey('b', 'latas')]);
    expect(somarCelulasSelecionadas(items, selected)).toEqual({ count: 2, latas: 30, caixas: 0 });
  });

  it('intervalo na mesma coluna', () => {
    const ids = ['a', 'b', 'c'];
    expect(chavesIntervaloColuna(ids, 'caixas', 'c', 'a')).toEqual([
      ordemCellKey('a', 'caixas'),
      ordemCellKey('b', 'caixas'),
      ordemCellKey('c', 'caixas'),
    ]);
  });

  it('totais do dia', () => {
    expect(
      totaisOrdemDiariaDia([
        { latasPlanejadas: 10, caixasEstimadas: 3 },
        { latasPlanejadas: 5, caixasEstimadas: 2 },
      ]),
    ).toEqual({ latas: 15, caixas: 5, itens: 2 });
  });
});
