import { describe, expect, it } from 'vitest';
import { QuadroOcupacao } from './quadro-ocupacao';

describe('QuadroOcupacao', () => {
  const ocupacao = new QuadroOcupacao();

  it('separa o aviso do posto e soma nas livres após as saídas', () => {
    expect(
      ocupacao.segmentos({
        aprovado: 10,
        contratados: 7,
        reservas: 1,
        afastados: 0,
        avisos: 2,
        livres: 2,
      }),
    ).toEqual({
      noPosto: 5,
      avisos: 2,
      reservas: 1,
      livres: 2,
      livresAposSaidas: 4,
    });
  });

  it('não inventa aviso além do que está no posto', () => {
    expect(
      ocupacao.segmentos({
        aprovado: 3,
        contratados: 2,
        reservas: 0,
        afastados: 1,
        avisos: 5,
        livres: 1,
      }).avisos,
    ).toBe(2);
  });

  it('mantém o quadro sem aviso igual ao atual', () => {
    expect(
      ocupacao.segmentos({
        aprovado: 4,
        contratados: 3,
        reservas: 0,
        afastados: 0,
        avisos: 0,
        livres: 1,
      }),
    ).toEqual({
      noPosto: 3,
      avisos: 0,
      reservas: 0,
      livres: 1,
      livresAposSaidas: 1,
    });
  });
});
