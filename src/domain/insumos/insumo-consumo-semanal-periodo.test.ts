import { describe, expect, it } from 'vitest';
import { InsumoConsumoSemanalPeriodoBuilder } from './insumo-consumo-semanal-periodo';

describe('InsumoConsumoSemanalPeriodoBuilder', () => {
  const builder = new InsumoConsumoSemanalPeriodoBuilder();

  it('monta periodo padrao com as ultimas quatro semanas fechadas', () => {
    // Âncora: terça 28/07/2026 — semana corrente = 26/07–01/08 (excluída)
    const periodo = builder.buildDefault(new Date('2026-07-28T12:00:00-03:00'));

    expect(periodo.visualizacao).toBe('semanal');
    expect(periodo.dataInicio).toBe('2026-06-28');
    expect(periodo.dataFim).toBe('2026-07-25');
    expect(periodo.colunas.map((coluna) => coluna.inicio)).toEqual([
      '2026-06-28',
      '2026-07-05',
      '2026-07-12',
      '2026-07-19',
    ]);
    expect(periodo.colunas.at(-1)?.fim).toBe('2026-07-25');
  });

  it('monta periodo diario padrao de D-7 ate D-1', () => {
    const periodo = builder.buildDefault(new Date('2026-07-15T12:00:00-03:00'), 'diaria');

    expect(periodo.visualizacao).toBe('diaria');
    expect(periodo.dataInicio).toBe('2026-07-08');
    expect(periodo.dataFim).toBe('2026-07-14');
    expect(periodo.colunas.map((coluna) => coluna.inicio)).toEqual([
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
    ]);
    expect(periodo.colunas[0]).toEqual({
      inicio: '2026-07-08',
      fim: '2026-07-08',
      label: '08/07',
    });
  });

  it('gera semanas completas que cobrem um intervalo customizado', () => {
    const periodo = builder.buildFromRange('2026-07-01', '2026-07-20', 'semanal');

    expect(periodo.dataInicio).toBe('2026-07-01');
    expect(periodo.dataFim).toBe('2026-07-20');
    expect(periodo.colunas).toEqual([
      { inicio: '2026-06-28', fim: '2026-07-04', label: '28/06 a 04/07' },
      { inicio: '2026-07-05', fim: '2026-07-11', label: '05/07 a 11/07' },
      { inicio: '2026-07-12', fim: '2026-07-18', label: '12/07 a 18/07' },
      { inicio: '2026-07-19', fim: '2026-07-25', label: '19/07 a 25/07' },
    ]);
  });

  it('gera colunas diarias para um intervalo customizado', () => {
    const periodo = builder.buildFromRange('2026-07-10', '2026-07-12', 'diaria');

    expect(periodo.colunas).toEqual([
      { inicio: '2026-07-10', fim: '2026-07-10', label: '10/07' },
      { inicio: '2026-07-11', fim: '2026-07-11', label: '11/07' },
      { inicio: '2026-07-12', fim: '2026-07-12', label: '12/07' },
    ]);
  });

  it('rejeita intervalo invertido', () => {
    expect(() => builder.buildFromRange('2026-07-20', '2026-07-01')).toThrow(
      'Data inicial deve ser anterior ou igual à data final',
    );
  });
});
