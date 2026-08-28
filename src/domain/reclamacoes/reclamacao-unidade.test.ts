import { describe, expect, it } from 'vitest';
import {
  assertReclamacaoQuantidade,
  formatarReclamacaoQuantidade,
  isReclamacaoUnidade,
} from './reclamacao-unidade';

describe('reclamacao-unidade', () => {
  it('aceita 1+ com unidade válida', () => {
    expect(assertReclamacaoQuantidade(1, 'caixas')).toBeNull();
    expect(assertReclamacaoQuantidade(25, 'pacotes')).toBeNull();
  });

  it('recusa 0, negativo, não-inteiro e unidade inválida', () => {
    expect(assertReclamacaoQuantidade(0, 'caixas')).toBe('Informe a quantidade.');
    expect(assertReclamacaoQuantidade(-1, 'pacotes')).toBe('Informe a quantidade.');
    expect(assertReclamacaoQuantidade(1.5, 'caixas')).toBe('Informe a quantidade.');
    expect(assertReclamacaoQuantidade(1, 'unidades')).toBe('Informe pacotes ou caixas.');
    expect(isReclamacaoUnidade('caixas')).toBe(true);
    expect(isReclamacaoUnidade('CX')).toBe(false);
  });

  it('formata rótulo da lista', () => {
    expect(formatarReclamacaoQuantidade(25, 'pacotes')).toBe('25 pacotes');
    expect(formatarReclamacaoQuantidade(10, 'caixas')).toBe('10 CX');
  });
});
