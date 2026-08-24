import { describe, expect, it } from 'vitest';
import {
  mensagemExcecaoReceitaCaixaInvalida,
  rotuloExcecaoCaixa,
} from './tipo-estoque-receita-caixa';

describe('mensagemExcecaoReceitaCaixaInvalida', () => {
  it('recusa receita que não é caixa', () => {
    expect(mensagemExcecaoReceitaCaixaInvalida({ tipo: 'massa' })).toBe(
      'A exceção deve ser uma receita do tipo caixa',
    );
  });
  it('recusa receita ausente', () => {
    expect(mensagemExcecaoReceitaCaixaInvalida(null)).toBe(
      'Receita de caixa não encontrada',
    );
  });
  it('aceita tipo caixa', () => {
    expect(mensagemExcecaoReceitaCaixaInvalida({ tipo: 'caixa' })).toBeNull();
  });
});

describe('rotuloExcecaoCaixa', () => {
  it('mostra Produto quando vazio', () => {
    expect(rotuloExcecaoCaixa(null)).toBe('Produto');
    expect(rotuloExcecaoCaixa('')).toBe('Produto');
  });
  it('mostra o nome da receita', () => {
    expect(rotuloExcecaoCaixa('Caixa Damião')).toBe('Caixa Damião');
  });
});
