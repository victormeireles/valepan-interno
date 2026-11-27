import { describe, expect, it } from 'vitest';
import type { AlvoPlano } from './escopo-manutencao';
import { EdicaoDescricaoPlano, type PlanoEmEdicao } from './edicao-descricao-plano';

const edicao = new EdicaoDescricaoPlano();

function plano(parcial: Partial<PlanoEmEdicao> = {}): PlanoEmEdicao {
  return {
    escopo: 'maquina',
    maquinaId: 'maq-1',
    frequenciaTipo: 'semanal',
    intervaloDias: null,
    diaSemana: 1,
    diaMes: null,
    ...parcial,
  };
}

function alvo(parcial: Partial<AlvoPlano> = {}): AlvoPlano {
  return { escopo: 'maquina', maquinaId: 'maq-1', ...parcial };
}

describe('EdicaoDescricaoPlano', () => {
  it('aceita só a descrição aparada quando máquina e frequência seguem iguais', () => {
    const atual = plano();
    expect(edicao.soDescricao(atual, alvo(), { tipo: 'semanal', diaSemana: 1 })).toBe(true);
    expect(edicao.aceitar('  Trocar correia  ')).toEqual({
      ok: true,
      descricao: 'Trocar correia',
    });
  });

  it('recusa descrição vazia', () => {
    expect(edicao.aceitar('   ')).toEqual({ ok: false, mensagem: 'Informe a descrição.' });
  });

  it('pede máquina quando o id muda e a frequência fica', () => {
    const atual = plano();
    expect(edicao.soDescricao(atual, alvo({ maquinaId: 'maq-2' }), { tipo: 'semanal', diaSemana: 1 })).toBe(
      false,
    );
    expect(edicao.mesmaFrequencia(atual, { tipo: 'semanal', diaSemana: 1 })).toBe(true);
  });

  it('pede frequência quando o dia, o intervalo ou o tipo mudam', () => {
    expect(edicao.soDescricao(plano(), alvo(), { tipo: 'semanal', diaSemana: 3 })).toBe(false);
    expect(
      edicao.soDescricao(
        plano({ frequenciaTipo: 'a_cada_n_dias', intervaloDias: 7, diaSemana: null }),
        alvo(),
        { tipo: 'a_cada_n_dias', intervalo: 14 },
      ),
    ).toBe(false);
    expect(edicao.soDescricao(plano(), alvo(), { tipo: 'mensal', diaMes: 10 })).toBe(false);
  });

  it('trata a fábrica inteira como o mesmo alvo enquanto a máquina continua vazia', () => {
    const atual = plano({ escopo: 'fabrica', maquinaId: null });
    const mesmo = alvo({ escopo: 'fabrica', maquinaId: null });
    const maquina = alvo({ escopo: 'maquina', maquinaId: 'maq-1' });
    expect(edicao.soDescricao(atual, mesmo, { tipo: 'semanal', diaSemana: 1 })).toBe(true);
    expect(edicao.soDescricao(atual, maquina, { tipo: 'semanal', diaSemana: 1 })).toBe(false);
  });
});
