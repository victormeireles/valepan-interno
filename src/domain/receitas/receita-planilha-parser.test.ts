import { describe, expect, it } from 'vitest';
import { parseColagemPlanilha } from './receita-planilha-parser';

describe('parseColagemPlanilha', () => {
  it('parseia tab entre nome e quantidade', () => {
    const result = parseColagemPlanilha('Farinha especial\t0,3\nAçúcar\t1');
    expect(result).toEqual([
      { nomeColado: 'Farinha especial', quantidade: 0.3 },
      { nomeColado: 'Açúcar', quantidade: 1 },
    ]);
  });

  it('parseia espaços múltiplos', () => {
    const result = parseColagemPlanilha('Sal  0,5');
    expect(result).toEqual([{ nomeColado: 'Sal', quantidade: 0.5 }]);
  });

  it('ignora linhas vazias e cabeçalho', () => {
    const text = 'Ingrediente\tQuantidade\n\nFermento\t0,02';
    expect(parseColagemPlanilha(text)).toEqual([
      { nomeColado: 'Fermento', quantidade: 0.02 },
    ]);
  });

  it('lança se nenhuma linha válida', () => {
    expect(() => parseColagemPlanilha('   \n')).toThrow(/nenhuma linha/i);
  });
});
