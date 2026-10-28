import { describe, expect, it } from 'vitest';
import { QuadroTotais } from './quadro-totais';

describe('QuadroTotais', () => {
  const producao = {
    turnos: [
      { aprovado: 10, contratados: 7, reservas: 1, livres: 2, apoio: [] },
      { aprovado: 4, contratados: 4, reservas: 0, livres: 0, apoio: [] },
    ],
  };
  const comercial = {
    turnos: [{ aprovado: 0, contratados: 0, reservas: 0, livres: 0, apoio: [{}, {}] }],
  };
  const expedicao = {
    turnos: [{ aprovado: 6, contratados: 3, reservas: 1, livres: 2, apoio: [{}] }],
  };

  it('soma os turnos do setor incluindo apoio no total', () => {
    expect(new QuadroTotais().doSetor(comercial, 'total')).toEqual({
      aprovado: 2,
      contratados: 2,
      reservas: 0,
      afastados: 0,
      livres: 0,
    });
  });

  it('ignora apoio no modo operacional', () => {
    expect(new QuadroTotais().doSetor(comercial, 'operacional')).toEqual({
      aprovado: 0,
      contratados: 0,
      reservas: 0,
      afastados: 0,
      livres: 0,
    });
    expect(new QuadroTotais().doTurno(expedicao.turnos[0]!, 'operacional')).toEqual({
      aprovado: 6,
      contratados: 3,
      reservas: 1,
      afastados: 0,
      livres: 2,
    });
  });

  it('soma o quadro inteiro a partir dos setores', () => {
    expect(new QuadroTotais().geral([producao, expedicao], 'total')).toEqual({
      aprovado: 21,
      contratados: 15,
      reservas: 2,
      afastados: 0,
      livres: 4,
    });
    expect(new QuadroTotais().geral([producao, expedicao], 'operacional')).toEqual({
      aprovado: 20,
      contratados: 14,
      reservas: 2,
      afastados: 0,
      livres: 4,
    });
  });

  it('devolve zero quando não há turnos', () => {
    expect(new QuadroTotais().geral([], 'total')).toEqual({
      aprovado: 0,
      contratados: 0,
      reservas: 0,
      afastados: 0,
      livres: 0,
    });
  });

  it('soma afastados no quadro total e mantém a vaga livre', () => {
    const turno = { aprovado: 10, contratados: 8, reservas: 0, livres: 2, afastados: 2, apoio: [] };
    expect(new QuadroTotais().doTurno(turno, 'total')).toEqual({
      aprovado: 10,
      contratados: 10,
      reservas: 0,
      afastados: 2,
      livres: 2,
    });
    expect(new QuadroTotais().doTurno(turno, 'operacional')).toEqual({
      aprovado: 10,
      contratados: 8,
      reservas: 0,
      afastados: 2,
      livres: 2,
    });
  });
});
