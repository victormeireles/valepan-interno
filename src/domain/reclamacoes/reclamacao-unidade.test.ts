import { describe, expect, it } from 'vitest';
import {
  assertReclamacaoQuantidade,
  formatarReclamacaoQuantidade,
  isReclamacaoUnidade,
  quantidadeParaGravar,
  RECLAMACAO_QUANTIDADE_INVALIDA,
} from './reclamacao-unidade';

describe('reclamacao-unidade', () => {
  it('aceita 1+ com unidade válida', () => {
    expect(assertReclamacaoQuantidade(1, 'caixas')).toBeNull();
    expect(assertReclamacaoQuantidade(25, 'pacotes')).toBeNull();
  });

  it('aceita quantidade desconhecida', () => {
    expect(assertReclamacaoQuantidade(null, '')).toBeNull();
    expect(assertReclamacaoQuantidade(null, 'pacotes')).toBeNull();
  });

  it('recusa 0, negativo, não-inteiro e unidade inválida', () => {
    expect(assertReclamacaoQuantidade(0, 'caixas')).toBe(RECLAMACAO_QUANTIDADE_INVALIDA);
    expect(assertReclamacaoQuantidade(-1, 'pacotes')).toBe(RECLAMACAO_QUANTIDADE_INVALIDA);
    expect(assertReclamacaoQuantidade(1.5, 'caixas')).toBe(RECLAMACAO_QUANTIDADE_INVALIDA);
    expect(assertReclamacaoQuantidade(1, 'unidades')).toBe('Informe pacotes ou caixas.');
    expect(isReclamacaoUnidade('caixas')).toBe(true);
    expect(isReclamacaoUnidade('CX')).toBe(false);
  });

  it('grava nulo quando a quantidade não foi informada', () => {
    expect(quantidadeParaGravar(null, 'pacotes')).toEqual({
      quantidade: null,
      unidade: null,
    });
    expect(quantidadeParaGravar(10, 'caixas')).toEqual({
      quantidade: 10,
      unidade: 'caixas',
    });
  });

  it('formata rótulo da lista', () => {
    expect(formatarReclamacaoQuantidade(25, 'pacotes')).toBe('25 pacotes');
    expect(formatarReclamacaoQuantidade(10, 'caixas')).toBe('10 CX');
    expect(formatarReclamacaoQuantidade(null, null)).toBe('—');
  });
});
