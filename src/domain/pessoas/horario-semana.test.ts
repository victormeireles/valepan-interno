import { describe, expect, it } from 'vitest';
import { HorarioSemana } from './horario-semana';

const semana = new HorarioSemana();

describe('HorarioSemana', () => {
  it('agrupa dias com o mesmo intervalo', () => {
    const dias = semana.padrao().map((dia) =>
      dia.dia === 6 ? { ...dia, inicio: '08:00', fim: '12:00', situacao: 'definido' as const } : dia,
    );
    expect(semana.resumir(dias)).toEqual(['Seg–Sex 08:00–17:00', 'Sáb 08:00–12:00']);
  });

  it('marca virada de dia quando o fim não passa do início', () => {
    const dias = semana.normalizar([
      { dia: 1, inicio: '21:00', fim: '07:00', terminaDiaSeguinte: false, situacao: 'definido' },
    ]);
    expect(dias[0]?.terminaDiaSeguinte).toBe(true);
    expect(semana.resumir(dias)).toEqual(['Seg 21:00–07:00 +1']);
  });

  it('ignora a flag antiga quando o fim é depois do início', () => {
    const dias = semana.normalizar([
      { dia: 1, inicio: '08:00', fim: '17:00', terminaDiaSeguinte: true, situacao: 'definido' },
    ]);
    expect(dias[0]?.terminaDiaSeguinte).toBe(false);
    expect(semana.resumir(dias)).toEqual(['Seg 08:00–17:00']);
  });

  it('recusa dia de trabalho sem horário', () => {
    const dias = semana.padrao().map((dia) => (dia.dia === 1 ? { ...dia, inicio: null } : dia));
    expect(semana.validar(dias)).toBe('Seg precisa de início e fim.');
  });
});
