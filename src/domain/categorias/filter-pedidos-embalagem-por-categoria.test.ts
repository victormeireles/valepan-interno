import { describe, expect, it } from 'vitest';
import { filterPedidosEmbalagemPorCategoriaVisivel } from './filter-pedidos-embalagem-por-categoria';

type Pedido = { id: string; produtoId: string };

describe('filterPedidosEmbalagemPorCategoriaVisivel', () => {
  const pedidos: Pedido[] = [
    { id: 'p1', produtoId: 'prod-hamb' },
    { id: 'p2', produtoId: 'prod-forma' },
    { id: 'p3', produtoId: 'prod-sem-cat' },
  ];

  const categoriaPorProduto = new Map<string, string | null>([
    ['prod-hamb', 'cat-hamb'],
    ['prod-forma', 'cat-forma'],
    ['prod-sem-cat', null],
  ]);

  const visiveis = new Set(['cat-hamb']);

  it('mantém pedidos de categoria visível', () => {
    const result = filterPedidosEmbalagemPorCategoriaVisivel(
      pedidos,
      categoriaPorProduto,
      visiveis,
    );
    expect(result.map((p) => p.id)).toEqual(['p1']);
  });

  it('exclui pedidos de categoria oculta', () => {
    const result = filterPedidosEmbalagemPorCategoriaVisivel(
      pedidos,
      categoriaPorProduto,
      visiveis,
    );
    expect(result.find((p) => p.id === 'p2')).toBeUndefined();
  });

  it('exclui produto sem categoria', () => {
    const result = filterPedidosEmbalagemPorCategoriaVisivel(
      pedidos,
      categoriaPorProduto,
      visiveis,
    );
    expect(result.find((p) => p.id === 'p3')).toBeUndefined();
  });

  it('retorna array vazio quando nenhuma categoria visível', () => {
    const result = filterPedidosEmbalagemPorCategoriaVisivel(
      pedidos,
      categoriaPorProduto,
      new Set(),
    );
    expect(result).toEqual([]);
  });
});
