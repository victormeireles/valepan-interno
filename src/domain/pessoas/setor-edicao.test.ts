import { describe, expect, it } from 'vitest';
import { SetorEdicao, type SetorEdicaoContexto } from './setor-edicao';

const existentes: SetorEdicaoContexto[] = [
  { codigo: 'FOR', nome: 'Forno', tipo: 'operacional', ativo: true },
  { codigo: 'EMB', nome: 'Embalagem', tipo: 'operacional', ativo: true },
  { codigo: 'ADM', nome: 'Administrativo', tipo: 'apoio', ativo: false },
];

describe('SetorEdicao', () => {
  const edicao = new SetorEdicao();

  it('lista só setores ativos com tipo conhecido, na ordem recebida', () => {
    expect(edicao.listarAtivos(existentes)).toEqual([
      { codigo: 'FOR', nome: 'Forno', tipo: 'operacional' },
      { codigo: 'EMB', nome: 'Embalagem', tipo: 'operacional' },
    ]);
  });

  it('aceita novo nome e tipo no mesmo código', () => {
    expect(edicao.validar({ codigo: 'FOR', nome: ' Forno 1 ', tipo: 'apoio' }, existentes)).toEqual({
      ok: true,
      valor: { codigo: 'FOR', nome: 'Forno 1', tipo: 'apoio' },
    });
  });

  it('recusa nome vazio, tipo inválido, setor inativo e nome repetido', () => {
    expect(edicao.validar({ codigo: 'FOR', nome: '  ', tipo: 'operacional' }, existentes)).toEqual({
      ok: false,
      mensagem: 'Informe o nome do setor.',
    });
    expect(edicao.validar({ codigo: 'FOR', nome: 'Forno', tipo: 'outro' }, existentes)).toEqual({
      ok: false,
      mensagem: 'Tipo de setor inválido.',
    });
    expect(edicao.validar({ codigo: 'ADM', nome: 'Administrativo', tipo: 'apoio' }, existentes)).toEqual({
      ok: false,
      mensagem: 'Setor não encontrado.',
    });
    expect(edicao.validar({ codigo: 'FOR', nome: 'embalagem', tipo: 'operacional' }, existentes)).toEqual({
      ok: false,
      mensagem: 'Já existe um setor com esse nome.',
    });
  });
});
