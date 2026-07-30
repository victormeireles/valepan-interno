import { describe, expect, it } from 'vitest';
import { InsumoConsumoSemanalAggregator } from './insumo-consumo-semanal-aggregator';
import type { InsumoConsumoPeriodo } from './insumo-consumo-semanal-periodo';

describe('InsumoConsumoSemanalAggregator', () => {
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

  it('soma somente movimentos de saida por insumo e semana', () => {
    const aggregator = new InsumoConsumoSemanalAggregator();

    const items = aggregator.aggregate(periodo, [
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-01',
        deltaQuantidade: -10,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: 'ferm-1',
        receitaId: 'receita-massa',
        receitaNome: 'Massa brioche',
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-06',
        deltaQuantidade: -3.5,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: 'ferm-2',
        receitaId: 'receita-massa',
        receitaNome: 'Massa brioche',
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-06',
        deltaQuantidade: 2,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: 'ferm-2',
        receitaId: 'receita-massa',
        receitaNome: 'Massa brioche',
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-06',
        deltaQuantidade: -7,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: null,
        receitaId: 'receita-massa',
        receitaNome: 'Massa brioche',
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-13',
        deltaQuantidade: -500,
        origem: 'ajuste_manual',
        fermentacaoLoteId: null,
        receitaId: 'receita-massa',
        receitaNome: 'Massa brioche',
      },
      {
        insumoId: 'sal',
        nome: 'Sal refinado',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-13',
        deltaQuantidade: -1,
        origem: 'producao_embalagem',
        embalagemLoteId: 'emb-1',
        receitaId: 'receita-caixa',
        receitaNome: 'Caixa padrão',
      },
    ]);

    expect(items).toEqual([
      {
        insumoId: 'farinha',
        nome: 'Farinha Tia Ofelia',
        unidadeResumida: 'KG',
        total: 13.5,
        estoqueAtual: 0,
        media: 0,
        coberturaDias: null,
        pico: 0,
        coberturaPicoDias: null,
        consumoPorSemana: {
          '2026-06-28': 10,
          '2026-07-05': 3.5,
          '2026-07-12': 0,
        },
        receitas: [
          {
            receitaId: 'receita-massa',
            receitaNome: 'Massa brioche',
            total: 13.5,
            consumoPorSemana: {
              '2026-06-28': 10,
              '2026-07-05': 3.5,
              '2026-07-12': 0,
            },
          },
        ],
      },
      {
        insumoId: 'sal',
        nome: 'Sal refinado',
        unidadeResumida: 'KG',
        total: 1,
        estoqueAtual: 0,
        media: 0,
        coberturaDias: null,
        pico: 0,
        coberturaPicoDias: null,
        consumoPorSemana: {
          '2026-06-28': 0,
          '2026-07-05': 0,
          '2026-07-12': 1,
        },
        receitas: [
          {
            receitaId: 'receita-caixa',
            receitaNome: 'Caixa padrão',
            total: 1,
            consumoPorSemana: {
              '2026-06-28': 0,
              '2026-07-05': 0,
              '2026-07-12': 1,
            },
          },
        ],
      },
    ]);
  });

  it('agrupa por dia na visao diaria', () => {
    const aggregator = new InsumoConsumoSemanalAggregator();
    const dailyPeriod: InsumoConsumoPeriodo = {
      dataInicio: '2026-07-10',
      dataFim: '2026-07-12',
      visualizacao: 'diaria',
      colunas: [
        { inicio: '2026-07-10', fim: '2026-07-10', label: '10/07' },
        { inicio: '2026-07-11', fim: '2026-07-11', label: '11/07' },
        { inicio: '2026-07-12', fim: '2026-07-12', label: '12/07' },
      ],
    };

    const items = aggregator.aggregate(dailyPeriod, [
      {
        insumoId: 'farinha',
        nome: 'Farinha',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-10',
        deltaQuantidade: -2,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: 'ferm-1',
        receitaId: 'receita-massa',
        receitaNome: 'Massa',
      },
      {
        insumoId: 'farinha',
        nome: 'Farinha',
        unidadeResumida: 'KG',
        dataMovimento: '2026-07-12',
        deltaQuantidade: -4,
        origem: 'producao_fermentacao',
        fermentacaoLoteId: 'ferm-2',
        receitaId: 'receita-massa',
        receitaNome: 'Massa',
      },
    ]);

    expect(items[0]?.consumoPorSemana).toEqual({
      '2026-07-10': 2,
      '2026-07-11': 0,
      '2026-07-12': 4,
    });
  });
});
