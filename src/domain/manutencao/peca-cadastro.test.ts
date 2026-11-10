import { describe, expect, it } from 'vitest';
import { PecaCadastro } from './peca-cadastro';

const entradaValida = {
  codigo: '  ROL-1 ',
  nome: '  Rolamento  ',
  unidade: 'kg',
  ativo: false,
};

describe('PecaCadastro', () => {
  const cadastro = new PecaCadastro();

  it('grava o código aparado e preserva ativo', () => {
    expect(cadastro.validar(entradaValida, [])).toEqual({
      ok: true,
      linha: {
        codigo: 'ROL-1',
        nome: 'Rolamento',
        unidade: 'kg',
        ativo: false,
      },
    });
  });

  it('grava ativo verdadeiro sem alterar', () => {
    const resultado = cadastro.validar({ ...entradaValida, ativo: true }, []);

    expect(resultado).toMatchObject({ ok: true, linha: { ativo: true } });
  });

  it('troca unidade vazia por UN', () => {
    expect(
      cadastro.validar({ ...entradaValida, unidade: '' }, []),
    ).toMatchObject({ ok: true, linha: { unidade: 'UN' } });
    expect(
      cadastro.validar({ ...entradaValida, unidade: '   ' }, []),
    ).toMatchObject({ ok: true, linha: { unidade: 'UN' } });
  });

  it('grava un em qualquer caixa como UN', () => {
    expect(
      cadastro.validar({ ...entradaValida, unidade: ' un ' }, []),
    ).toMatchObject({ ok: true, linha: { unidade: 'UN' } });
    expect(
      cadastro.validar({ ...entradaValida, unidade: 'Un' }, []),
    ).toMatchObject({ ok: true, linha: { unidade: 'UN' } });
  });

  it('apara outra unidade sem mudar as letras', () => {
    expect(
      cadastro.validar({ ...entradaValida, unidade: ' KG ' }, []),
    ).toMatchObject({ ok: true, linha: { unidade: 'KG' } });
  });

  it('recusa código vazio', () => {
    expect(cadastro.validar({ ...entradaValida, codigo: '' }, [])).toEqual({
      ok: false,
      mensagem: 'Informe o código.',
    });
    expect(cadastro.validar({ ...entradaValida, codigo: '   ' }, [])).toEqual({
      ok: false,
      mensagem: 'Informe o código.',
    });
  });

  it('recusa nome vazio', () => {
    expect(cadastro.validar({ ...entradaValida, nome: '' }, [])).toEqual({
      ok: false,
      mensagem: 'Informe o nome.',
    });
    expect(cadastro.validar({ ...entradaValida, nome: '  ' }, [])).toEqual({
      ok: false,
      mensagem: 'Informe o nome.',
    });
  });

  it('recusa código já usado, ignorando maiúsculas e espaços das pontas', () => {
    expect(
      cadastro.validar(entradaValida, [{ id: 'peca-2', codigo: '  rol-1  ' }]),
    ).toEqual({
      ok: false,
      mensagem: 'Já existe uma peça com esse código.',
    });
  });

  it('permite o mesmo código da própria peça na edição', () => {
    const resultado = cadastro.validar(
      entradaValida,
      [
        { id: 'peca-1', codigo: 'rol-1' },
        { id: 'peca-2', codigo: 'OUTRA' },
      ],
      'peca-1',
    );

    expect(resultado.ok).toBe(true);
  });
});
