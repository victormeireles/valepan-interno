import { describe, expect, it } from 'vitest';
import { massaReceitasMetaAtingida } from './massa-novo-lote-confirm';

describe('massaReceitasMetaAtingida', () => {
  it('retorna false quando ainda faltam receitas', () => {
    expect(massaReceitasMetaAtingida(2, 5)).toBe(false);
  });

  it('retorna true quando batidas cobrem a meta', () => {
    expect(massaReceitasMetaAtingida(5, 5)).toBe(true);
    expect(massaReceitasMetaAtingida(6, 5)).toBe(true);
  });

  it('retorna false sem meta definida', () => {
    expect(massaReceitasMetaAtingida(10, 0)).toBe(false);
  });
});
