import { describe, expect, it } from 'vitest';

import { FluxoMatrizHorariaBuilder } from './fluxo-matriz-horaria';

describe('FluxoMatrizHorariaBuilder', () => {
  it('hachura OP anterior em ferm e forno', () => {
    const { matriz, matrizAnt } = new FluxoMatrizHorariaBuilder().build(['60g'], {
      ferm: [{ assadeiraNome: '60g', unidades: 40, hour: 22, opAnterior: true }],
      forno: [{ assadeiraNome: '60g', unidades: 10, hour: 23, opAnterior: true }],
      emb: [],
    });
    expect(matriz.ferm['60g'][22]).toBe(40);
    expect(matrizAnt.ferm['60g'][22]).toBe(40);
    expect(matriz.forno['60g'][23]).toBe(10);
    expect(matrizAnt.forno['60g'][23]).toBe(10);
  });
});
