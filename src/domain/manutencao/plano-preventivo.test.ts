import { describe, expect, it } from 'vitest';
import { PlanoPreventivo } from './plano-preventivo';
import type { FrequenciaPlano } from './proxima-data-preventiva';

const maquinaAtiva = { id: 'maq-1', ativo: true };

function entrada(parcial: {
  maquinaId?: string;
  descricao?: string;
  frequencia?: FrequenciaPlano;
  primeiraData?: string;
  hojeSp?: string;
} = {}) {
  return {
    maquinaId: 'maq-1',
    descricao: 'Lubrificar rolamentos',
    frequencia: { tipo: 'semanal', diaSemana: 1 } as FrequenciaPlano,
    primeiraData: '2026-11-09',
    hojeSp: '2026-11-09',
    ...parcial,
  };
}

describe('PlanoPreventivo', () => {
  const plano = new PlanoPreventivo();

  it('recusa primeira data no passado', () => {
    expect(
      plano.validar(entrada({ primeiraData: '2026-11-08' }), maquinaAtiva),
    ).toEqual({ ok: false, mensagem: 'Informe uma data de hoje ou futura.' });
  });

  it('recusa intervalo menor que 1', () => {
    const frequencia: FrequenciaPlano = {
      tipo: 'a_cada_n_dias',
      intervalo: 0,
      ancora: '2026-11-09',
    };
    expect(plano.validar(entrada({ frequencia }), maquinaAtiva)).toEqual({
      ok: false,
      mensagem: 'Informe o intervalo em dias.',
    });
  });

  it('recusa dia da semana fora de 1 a 7', () => {
    expect(
      plano.validar(
        entrada({ frequencia: { tipo: 'semanal', diaSemana: 0 } }),
        maquinaAtiva,
      ),
    ).toEqual({ ok: false, mensagem: 'Informe o dia da semana.' });
    expect(
      plano.validar(
        entrada({ frequencia: { tipo: 'semanal', diaSemana: 8 } }),
        maquinaAtiva,
      ),
    ).toEqual({ ok: false, mensagem: 'Informe o dia da semana.' });
  });

  it('recusa dia do mês fora de 1 a 28', () => {
    expect(
      plano.validar(
        entrada({
          frequencia: { tipo: 'mensal', diaMes: 0 },
          primeiraData: '2026-11-10',
        }),
        maquinaAtiva,
      ),
    ).toEqual({ ok: false, mensagem: 'Informe o dia do mês.' });
    expect(
      plano.validar(
        entrada({
          frequencia: { tipo: 'mensal', diaMes: 29 },
          primeiraData: '2026-11-10',
        }),
        maquinaAtiva,
      ),
    ).toEqual({ ok: false, mensagem: 'Informe o dia do mês.' });
  });

  it('recusa máquina inativa', () => {
    expect(
      plano.validar(entrada(), { id: 'maq-1', ativo: false }),
    ).toEqual({ ok: false, mensagem: 'Máquina inativa.' });
  });

  it('recusa máquina ausente', () => {
    expect(plano.validar(entrada(), null)).toEqual({
      ok: false,
      mensagem: 'Máquina não encontrada.',
    });
  });

  it('recusa descrição vazia', () => {
    expect(plano.validar(entrada({ descricao: '   ' }), maquinaAtiva)).toEqual({
      ok: false,
      mensagem: 'Informe a descrição.',
    });
  });

  it('recusa primeira data fora da grade do intervalo', () => {
    expect(
      plano.validar(
        entrada({
          frequencia: {
            tipo: 'a_cada_n_dias',
            intervalo: 7,
            ancora: '2026-11-01',
          },
          primeiraData: '2026-11-09',
        }),
        maquinaAtiva,
      ),
    ).toEqual({
      ok: false,
      mensagem: 'A primeira data deve cair no intervalo escolhido.',
    });
  });

  it('recusa primeira data semanal que não cai no dia escolhido', () => {
    expect(
      plano.validar(entrada({ primeiraData: '2026-11-10' }), maquinaAtiva),
    ).toEqual({
      ok: false,
      mensagem: 'A primeira data deve cair no dia da semana escolhido.',
    });
  });

  it('recusa primeira data mensal que não cai no dia escolhido', () => {
    expect(
      plano.validar(
        entrada({
          frequencia: { tipo: 'mensal', diaMes: 10 },
          primeiraData: '2026-11-11',
        }),
        maquinaAtiva,
      ),
    ).toEqual({
      ok: false,
      mensagem: 'A primeira data deve cair no dia do mês escolhido.',
    });
  });

  it('aceita plano que começa hoje e guarda essa data como próxima', () => {
    expect(plano.validar(entrada({ descricao: '  Trocar correia  ' }), maquinaAtiva)).toEqual({
      ok: true,
      descricao: 'Trocar correia',
      proximaEm: '2026-11-09',
    });
  });

  it('aceita primeira data futura sem puxar o encaixe de depois de hoje', () => {
    expect(
      plano.validar(
        entrada({ primeiraData: '2026-11-16', hojeSp: '2026-11-08' }),
        maquinaAtiva,
      ),
    ).toEqual({
      ok: true,
      descricao: 'Lubrificar rolamentos',
      proximaEm: '2026-11-16',
    });
  });

  it('grava a âncora na primeira data do intervalo', () => {
    expect(
      plano.validar(
        entrada({
          frequencia: {
            tipo: 'a_cada_n_dias',
            intervalo: 7,
            ancora: '2026-11-09',
          },
          primeiraData: '2026-11-09',
        }),
        maquinaAtiva,
      ),
    ).toEqual({
      ok: true,
      descricao: 'Lubrificar rolamentos',
      proximaEm: '2026-11-09',
      ancora: '2026-11-09',
    });
  });
});
