import { describe, expect, it } from 'vitest';
import {
  formatOrdemQuantidadeLabel,
  resolveModoQuantidade,
} from './ordem-quantidade-label';

describe('resolveModoQuantidade', () => {
  it('retorna unidades sem assadeira', () => {
    expect(resolveModoQuantidade('', 0)).toBe('unidades');
  });

  it('retorna latas com assadeira', () => {
    expect(resolveModoQuantidade('ass-1', 12)).toBe('latas');
  });
});

describe('formatOrdemQuantidadeLabel', () => {
  it('formata latas com derivados', () => {
    expect(
      formatOrdemQuantidadeLabel({
        modo: 'latas',
        assadeiras: 12,
        unidades: 480,
        caixas: 20,
      }),
    ).toBe('12 LT → 480 UN • 20 CX');
  });

  it('formata unidades sem caixas', () => {
    expect(
      formatOrdemQuantidadeLabel({
        modo: 'unidades',
        assadeiras: 0,
        unidades: 500,
        caixas: 0,
      }),
    ).toBe('500 UN');
  });

  it('formata unidades com caixas', () => {
    expect(
      formatOrdemQuantidadeLabel({
        modo: 'unidades',
        assadeiras: 0,
        unidades: 1000,
        caixas: 41,
      }),
    ).toBe('1000 UN • 41 CX');
  });
});
