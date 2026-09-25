import { describe, expect, it } from 'vitest';
import { HorarioDiaParser } from './horario-dia';

describe('HorarioDiaParser', () => {
  it('parseia intervalo que termina no dia seguinte', () => {
    expect(new HorarioDiaParser().parseCelula('21:00–07:00 (+1 dia)')).toEqual({
      inicio: '21:00',
      fim: '07:00',
      terminaDiaSeguinte: true,
      situacao: 'definido',
    });
  });

  it('marca não trabalha', () => {
    expect(new HorarioDiaParser().parseCelula('não trabalha').situacao).toBe('nao_trabalha');
  });

  it('marca a confirmar', () => {
    expect(new HorarioDiaParser().parseCelula('**a confirmar**')).toEqual({
      inicio: null,
      fim: null,
      terminaDiaSeguinte: false,
      situacao: 'a_confirmar',
    });
  });
});
