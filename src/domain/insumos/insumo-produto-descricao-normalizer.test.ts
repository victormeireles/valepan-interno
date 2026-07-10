import { describe, expect, it } from 'vitest';
import { normalizarDescricaoProdutoOmie } from '@/domain/insumos/insumo-produto-descricao-normalizer';

describe('normalizarDescricaoProdutoOmie', () => {
  it('remove espaços e converte para maiúsculas', () => {
    expect(normalizarDescricaoProdutoOmie('  Forminhas Empada  ')).toBe(
      'FORMINHAS EMPADA',
    );
  });

  it('retorna string vazia para valores nulos', () => {
    expect(normalizarDescricaoProdutoOmie(null)).toBe('');
    expect(normalizarDescricaoProdutoOmie(undefined)).toBe('');
  });
});
