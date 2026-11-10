import { describe, expect, it } from 'vitest';
import { OrdemAbertura, type AberturaEntrada } from './ordem-abertura';

const maquinaAtiva = { id: 'maq-1', ativo: true, setorId: 'setor-forno' };

function entrada(parcial: Partial<AberturaEntrada> = {}): AberturaEntrada {
  return {
    maquinaId: 'maq-1',
    urgencia: 'maquina_parou',
    tipoProblema: 'mecanico',
    descricao: 'Correia solta',
    ...parcial,
  };
}

describe('OrdemAbertura', () => {
  const abertura = new OrdemAbertura();

  it('recusa máquina ausente', () => {
    expect(abertura.validar(entrada(), null, 'todos')).toEqual({
      ok: false,
      mensagem: 'Máquina não encontrada.',
    });
  });

  it('recusa máquina inativa', () => {
    expect(
      abertura.validar(entrada(), { ...maquinaAtiva, ativo: false }, 'todos'),
    ).toEqual({ ok: false, mensagem: 'Máquina inativa.' });
  });

  it('recusa máquina de setor fora da lista', () => {
    expect(abertura.validar(entrada(), maquinaAtiva, ['setor-embalagem'])).toEqual({
      ok: false,
      mensagem: 'Escolha uma máquina de um setor liberado.',
    });
  });

  it('recusa descrição vazia', () => {
    expect(abertura.validar(entrada({ descricao: '' }), maquinaAtiva, 'todos')).toEqual({
      ok: false,
      mensagem: 'Informe a descrição.',
    });
    expect(abertura.validar(entrada({ descricao: '   ' }), maquinaAtiva, 'todos')).toEqual({
      ok: false,
      mensagem: 'Informe a descrição.',
    });
  });

  it('recusa urgência inválida', () => {
    const urgencia = 'baixa' as AberturaEntrada['urgencia'];
    expect(abertura.validar(entrada({ urgencia }), maquinaAtiva, 'todos')).toEqual({
      ok: false,
      mensagem: 'Informe a urgência.',
    });
  });

  it('recusa tipo de problema inválido', () => {
    const tipoProblema = 'hidraulico' as AberturaEntrada['tipoProblema'];
    expect(abertura.validar(entrada({ tipoProblema }), maquinaAtiva, 'todos')).toEqual({
      ok: false,
      mensagem: 'Informe o tipo de problema.',
    });
  });

  it('aceita máquina ativa de qualquer setor quando a visão é todos', () => {
    expect(abertura.validar(entrada(), maquinaAtiva, 'todos')).toEqual({
      ok: true,
      setorId: 'setor-forno',
      descricao: 'Correia solta',
    });
  });

  it('aceita o setor liberado e devolve a descrição aparada', () => {
    expect(
      abertura.validar(
        entrada({ descricao: '  Correia solta  ' }),
        maquinaAtiva,
        ['setor-forno'],
      ),
    ).toEqual({
      ok: true,
      setorId: 'setor-forno',
      descricao: 'Correia solta',
    });
  });
});
