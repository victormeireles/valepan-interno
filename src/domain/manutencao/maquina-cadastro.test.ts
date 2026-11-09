import { describe, expect, it } from 'vitest';
import { MaquinaCadastro } from './maquina-cadastro';
import type { SetorLinha } from './setor-operacional';

const operacional: SetorLinha = {
  id: 'setor-forno',
  nome: 'Forno',
  tipo: 'operacional',
  ativo: true,
};

const apoio: SetorLinha = {
  id: 'setor-apoio',
  nome: 'Apoio',
  tipo: 'apoio',
  ativo: true,
};

const operacionalInativo: SetorLinha = {
  id: 'setor-parado',
  nome: 'Parado',
  tipo: 'operacional',
  ativo: false,
};

const entradaValida = {
  codigo: '  Forno 01  ',
  nome: '  Forno principal  ',
  setorId: operacional.id,
  observacao: '   ',
  ativo: false,
};

describe('MaquinaCadastro', () => {
  const cadastro = new MaquinaCadastro();

  it('recusa código vazio', () => {
    expect(
      cadastro.validar({ ...entradaValida, codigo: '' }, [operacional], []),
    ).toEqual({ ok: false, mensagem: 'Informe o código.' });
    expect(
      cadastro.validar({ ...entradaValida, codigo: '   ' }, [operacional], []),
    ).toEqual({ ok: false, mensagem: 'Informe o código.' });
  });

  it('recusa nome vazio', () => {
    expect(
      cadastro.validar({ ...entradaValida, nome: '  ' }, [operacional], []),
    ).toEqual({ ok: false, mensagem: 'Informe o nome.' });
  });

  it('recusa setor ausente', () => {
    expect(
      cadastro.validar({ ...entradaValida, setorId: '' }, [operacional], []),
    ).toEqual({
      ok: false,
      mensagem: 'Escolha um setor operacional ativo.',
    });
  });

  it('recusa setor operacional inativo na criação', () => {
    expect(
      cadastro.validar(
        { ...entradaValida, setorId: operacionalInativo.id },
        [operacional, operacionalInativo],
        [],
      ),
    ).toEqual({
      ok: false,
      mensagem: 'Escolha um setor operacional ativo.',
    });
  });

  it('na edição mantém o setor atual mesmo inelegível', () => {
    const resultado = cadastro.validar(
      { ...entradaValida, setorId: operacionalInativo.id },
      [operacional, operacionalInativo],
      [],
      'maq-1',
      operacionalInativo.id,
    );

    expect(resultado).toMatchObject({
      ok: true,
      linha: { setorId: operacionalInativo.id },
    });
  });

  it('recusa setor de apoio', () => {
    expect(
      cadastro.validar(
        { ...entradaValida, setorId: apoio.id },
        [operacional, apoio],
        [],
      ),
    ).toEqual({
      ok: false,
      mensagem: 'Escolha um setor operacional ativo.',
    });
  });

  it('recusa código já usado por outra máquina', () => {
    expect(
      cadastro.validar({ ...entradaValida, codigo: '  FORNO 01  ' }, [operacional], [
        { id: 'maq-2', codigo: 'forno 01' },
      ]),
    ).toEqual({
      ok: false,
      mensagem: 'Já existe uma máquina com esse código.',
    });
  });

  it('permite o mesmo código da própria máquina na edição', () => {
    const resultado = cadastro.validar(
      entradaValida,
      [operacional],
      [{ id: 'maq-1', codigo: 'Forno 01' }],
      'maq-1',
    );

    expect(resultado.ok).toBe(true);
  });

  it('grava observação em branco como null e preserva trim e ativo', () => {
    expect(cadastro.validar(entradaValida, [operacional], [])).toEqual({
      ok: true,
      linha: {
        codigo: 'Forno 01',
        nome: 'Forno principal',
        setorId: operacional.id,
        observacao: null,
        ativo: false,
      },
    });
  });
});
