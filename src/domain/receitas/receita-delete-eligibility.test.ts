import { describe, expect, it } from 'vitest';
import {
  countProdutosVinculadosReceita,
  motivoBloqueioRemocaoReceita,
  podeRemoverReceita,
} from '@/domain/receitas/receita-delete-eligibility';

describe('podeRemoverReceita', () => {
  it('permite quando não há produtos', () => {
    expect(podeRemoverReceita(0)).toBe(true);
  });

  it('bloqueia quando há produtos', () => {
    expect(podeRemoverReceita(1)).toBe(false);
    expect(podeRemoverReceita(3)).toBe(false);
  });
});

describe('countProdutosVinculadosReceita', () => {
  it('conta todos os vínculos, ativos ou não', () => {
    expect(countProdutosVinculadosReceita([{ id: 'a' }, { id: 'b' }])).toBe(2);
    expect(countProdutosVinculadosReceita([])).toBe(0);
    expect(countProdutosVinculadosReceita(null)).toBe(0);
  });
});

describe('motivoBloqueioRemocaoReceita', () => {
  it('mensagem no singular e plural', () => {
    expect(motivoBloqueioRemocaoReceita(1)).toContain('1 produto');
    expect(motivoBloqueioRemocaoReceita(2)).toContain('2 produtos');
    expect(motivoBloqueioRemocaoReceita(0)).toBe('');
  });
});
