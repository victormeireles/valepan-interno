import { describe, expect, it } from 'vitest';
import { InsumoConsumoAgregadoMapper } from './insumo-consumo-agregado-mapper';
import type { InsumoConsumoPeriodo } from './insumo-consumo-semanal-periodo';

describe('InsumoConsumoAgregadoMapper', () => {
  const periodo: InsumoConsumoPeriodo = {
    dataInicio: '2026-07-01',
    dataFim: '2026-07-14',
    visualizacao: 'semanal',
    colunas: [
      { inicio: '2026-06-28', fim: '2026-07-04', label: '28/06 a 04/07' },
      { inicio: '2026-07-05', fim: '2026-07-11', label: '05/07 a 11/07' },
      { inicio: '2026-07-12', fim: '2026-07-18', label: '12/07 a 18/07' },
    ],
  };

  it('monta itens por insumo preenchendo colunas do periodo', () => {
    const mapper = new InsumoConsumoAgregadoMapper();

    const items = mapper.toSemanalItems(periodo, [
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        colunaInicio: '2026-06-28',
        consumo: 10,
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        colunaInicio: '2026-07-05',
        consumo: 3.5,
      },
      {
        insumoId: 'sal',
        nome: 'Sal refinado',
        unidadeResumida: 'KG',
        colunaInicio: '2026-07-12',
        consumo: 2,
      },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      insumoId: 'farinha',
      nome: 'Farinha Tia Ofelia',
      unidadeResumida: 'KG',
      total: 13.5,
      consumoPorSemana: {
        '2026-06-28': 10,
        '2026-07-05': 3.5,
        '2026-07-12': 0,
      },
      receitas: [],
    });
    expect(items[1]).toMatchObject({
      insumoId: 'sal',
      total: 2,
      consumoPorSemana: {
        '2026-06-28': 0,
        '2026-07-05': 0,
        '2026-07-12': 2,
      },
    });
  });

  it('ignora colunas fora do periodo e ordena por nome', () => {
    const mapper = new InsumoConsumoAgregadoMapper();

    const items = mapper.toSemanalItems(periodo, [
      {
        insumoId: 'sal',
        nome: 'Sal',
        unidadeResumida: 'KG',
        colunaInicio: '2026-07-12',
        consumo: 1,
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha',
        unidadeResumida: 'KG',
        colunaInicio: '2026-07-19',
        consumo: 99,
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha',
        unidadeResumida: 'KG',
        colunaInicio: '2026-07-05',
        consumo: 4,
      },
    ]);

    expect(items.map((item) => item.nome)).toEqual(['Farinha', 'Sal']);
    expect(items[0].total).toBe(4);
    expect(items[0].consumoPorSemana['2026-07-19']).toBeUndefined();
  });
});
