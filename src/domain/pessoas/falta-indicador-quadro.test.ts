import { describe, expect, it } from 'vitest';
import { FaltaIndicadorQuadro } from './falta-indicador-quadro';

describe('FaltaIndicadorQuadro', () => {
  const indicador = new FaltaIndicadorQuadro();

  it('mostra a fatia do total do filtro', () => {
    expect(indicador.participacao(26, 88)).toEqual({ valor: '30%', rotulo: 'do total' });
  });

  it('mostra a média de faltas por pessoa do filtro', () => {
    expect(indicador.media(77, 88)).toEqual({ valor: '0,88', rotulo: 'por pessoa' });
  });

  it('trata total vazio e fatia menor que 1%', () => {
    expect(indicador.participacao(1, 0)).toEqual({ valor: '—', rotulo: 'do total' });
    expect(indicador.participacao(1, 1000)).toEqual({ valor: '<1%', rotulo: 'do total' });
    expect(indicador.media(4, 0)).toEqual({ valor: '—', rotulo: 'por pessoa' });
  });
});
