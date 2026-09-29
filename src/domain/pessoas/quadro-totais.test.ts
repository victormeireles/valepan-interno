import { describe, expect, it } from 'vitest';
import { QuadroTotais } from './quadro-totais';

describe('QuadroTotais', () => {
  const producao = {
    turnos: [
      { aprovado: 10, contratados: 7, reservas: 1, livres: 2 },
      { aprovado: 4, contratados: 4, reservas: 0, livres: 0 },
    ],
  };
  const expedicao = {
    turnos: [{ aprovado: 6, contratados: 3, reservas: 1, livres: 2 }],
  };

  it('soma os turnos do setor', () => {
    expect(new QuadroTotais().doSetor(producao)).toEqual({
      aprovado: 14,
      contratados: 11,
      reservas: 1,
      livres: 2,
    });
  });

  it('soma o quadro inteiro a partir dos setores', () => {
    expect(new QuadroTotais().geral([producao, expedicao])).toEqual({
      aprovado: 20,
      contratados: 14,
      reservas: 2,
      livres: 4,
    });
  });

  it('devolve zero quando não há turnos', () => {
    expect(new QuadroTotais().geral([])).toEqual({
      aprovado: 0,
      contratados: 0,
      reservas: 0,
      livres: 0,
    });
  });
});
