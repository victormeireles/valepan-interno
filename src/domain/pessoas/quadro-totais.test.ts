import { describe, expect, it } from 'vitest';
import { QuadroTotais } from './quadro-totais';

describe('QuadroTotais', () => {
  const producao = {
    turnos: [
      { aprovado: 10, contratados: 7, reservas: 1, livres: 2, operacional: true },
      { aprovado: 4, contratados: 4, reservas: 0, livres: 0, operacional: true },
    ],
  };
  const comercial = {
    turnos: [{ aprovado: 2, contratados: 2, reservas: 0, livres: 0, operacional: false }],
  };
  const expedicao = {
    turnos: [{ aprovado: 6, contratados: 3, reservas: 1, livres: 2, operacional: true }],
  };

  it('soma as vagas do setor sem inflar com apoio', () => {
    expect(new QuadroTotais().doSetor(comercial, 'total')).toEqual({
      aprovado: 2,
      contratados: 2,
      reservas: 0,
      afastados: 0,
      avisos: 0,
      livres: 0,
      ferias: 0,
    });
  });

  it('ignora turnos não operacionais no modo operacional', () => {
    expect(new QuadroTotais().doSetor(comercial, 'operacional')).toEqual({
      aprovado: 0,
      contratados: 0,
      reservas: 0,
      afastados: 0,
      avisos: 0,
      livres: 0,
      ferias: 0,
    });
    expect(new QuadroTotais().doTurno(expedicao.turnos[0]!, 'operacional')).toEqual({
      aprovado: 6,
      contratados: 3,
      reservas: 1,
      afastados: 0,
      avisos: 0,
      livres: 2,
      ferias: 0,
    });
  });

  it('soma o quadro inteiro a partir dos setores', () => {
    expect(new QuadroTotais().geral([producao, expedicao, comercial], 'total')).toEqual({
      aprovado: 22,
      contratados: 16,
      reservas: 2,
      afastados: 0,
      avisos: 0,
      livres: 4,
      ferias: 0,
    });
    expect(new QuadroTotais().geral([producao, expedicao, comercial], 'operacional')).toEqual({
      aprovado: 20,
      contratados: 14,
      reservas: 2,
      afastados: 0,
      avisos: 0,
      livres: 4,
      ferias: 0,
    });
  });

  it('devolve zero quando não há turnos', () => {
    expect(new QuadroTotais().geral([], 'total')).toEqual({
      aprovado: 0,
      contratados: 0,
      reservas: 0,
      afastados: 0,
      avisos: 0,
      livres: 0,
      ferias: 0,
    });
  });

  it('soma afastados no quadro total e mantém a vaga livre', () => {
    const turno = { aprovado: 10, contratados: 8, reservas: 0, livres: 2, afastados: 2, operacional: true };
    expect(new QuadroTotais().doTurno(turno, 'total')).toEqual({
      aprovado: 10,
      contratados: 10,
      reservas: 0,
      afastados: 2,
      avisos: 0,
      livres: 2,
      ferias: 0,
    });
    expect(new QuadroTotais().doTurno(turno, 'operacional')).toEqual({
      aprovado: 10,
      contratados: 8,
      reservas: 0,
      afastados: 2,
      avisos: 0,
      livres: 2,
      ferias: 0,
    });
  });

  it('soma férias dos turnos sem abrir vaga', () => {
    const turno = { aprovado: 4, contratados: 4, reservas: 0, livres: 0, ferias: 2, operacional: true };
    expect(new QuadroTotais().geral([{ turnos: [turno, { ...turno, ferias: 1 }] }]).ferias).toBe(3);
    expect(new QuadroTotais().doTurno(turno).livres).toBe(0);
  });

  it('soma avisos sem mudar as vagas livres de hoje', () => {
    const turno = { aprovado: 10, contratados: 8, reservas: 0, livres: 2, avisos: 3, operacional: true };
    expect(new QuadroTotais().doTurno(turno, 'total')).toMatchObject({ avisos: 3, livres: 2, contratados: 8 });
    expect(new QuadroTotais().geral([{ turnos: [turno] }], 'operacional').avisos).toBe(3);
  });
});
