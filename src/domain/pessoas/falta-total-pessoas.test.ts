import { describe, expect, it } from 'vitest';
import { FaltaTotalPessoas, type FaltaParaTotal, type PessoaBaseFalta } from './falta-total-pessoas';

const pessoas: PessoaBaseFalta[] = [
  { codigo: 'A', situacao: 'ativo', avisoAtivo: false, setorTipo: 'operacional' },
  { codigo: 'B', situacao: 'ativo', avisoAtivo: true, setorTipo: 'operacional' },
  { codigo: 'C', situacao: 'afastado', avisoAtivo: false, setorTipo: 'operacional' },
  { codigo: 'D', situacao: 'admissao_prevista', avisoAtivo: false, setorTipo: 'apoio' },
  { codigo: 'E', situacao: 'desligado', avisoAtivo: false, setorTipo: 'operacional' },
  { codigo: 'F', situacao: 'ativo', avisoAtivo: false, setorTipo: 'apoio' },
  { codigo: 'G', situacao: 'ativo', avisoAtivo: false, setorTipo: null },
];

const faltas: FaltaParaTotal[] = [
  { codigo: 'E', cancelada: false, situacao: 'desligado', setorTipo: 'operacional' },
  { codigo: 'E', cancelada: false, situacao: 'desligado', setorTipo: 'operacional' },
  { codigo: 'H', cancelada: false, situacao: 'desligado', setorTipo: 'apoio' },
  { codigo: 'I', cancelada: true, situacao: 'desligado', setorTipo: 'operacional' },
];

describe('FaltaTotalPessoas', () => {
  const total = new FaltaTotalPessoas();

  it('em todos soma o quadro atual e só os desligados com falta no período', () => {
    expect(total.contar(pessoas, faltas, { situacao: 'todos', setorTipo: 'todos' })).toBe(8);
  });

  it('em ativos conta quem está no posto, mesmo sem falta', () => {
    expect(total.contar(pessoas, faltas, { situacao: 'ativos', setorTipo: 'todos' })).toBe(3);
  });

  it('em desligados ignora quem saiu sem falta e quem só tem falta cancelada', () => {
    expect(total.contar(pessoas, faltas, { situacao: 'desligados', setorTipo: 'todos' })).toBe(2);
  });

  it('restringe o quadro pelo tipo do setor atual e o desligado pelo setor da falta', () => {
    expect(total.contar(pessoas, faltas, { situacao: 'todos', setorTipo: 'operacional' })).toBe(4);
    expect(total.contar(pessoas, faltas, { situacao: 'todos', setorTipo: 'apoio' })).toBe(3);
    expect(total.contar(pessoas, faltas, { situacao: 'ativos', setorTipo: 'operacional' })).toBe(1);
  });
});
