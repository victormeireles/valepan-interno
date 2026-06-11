import { describe, expect, it } from 'vitest';
import type { EstoqueRecord } from '@/domain/types/inventario';
import {
  SEM_FAMILIA_LABEL,
  buildStockTree,
  countProductsInTree,
  extractProductVariationLabel,
  filterStockTree,
  pruneEmptyStockTree,
} from './stock-grouping';

function record(partial: Partial<EstoqueRecord> & Pick<EstoqueRecord, 'cliente' | 'produto'>): EstoqueRecord {
  return {
    quantidade: { caixas: 1, pacotes: 0, unidades: 0, kg: 0 },
    atualizadoEm: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('buildStockTree', () => {
  it('agrupa por tipo, família e produto com totais', () => {
    const tree = buildStockTree([
      record({
        cliente: 'Valepan',
        produto: 'HB Brioche 60g',
        tipoEstoqueId: 'tipo-1',
        produtoId: 'p1',
        produtoFamiliaId: 'fam-1',
        produtoFamiliaNome: 'HB Brioche',
        ordemFamilia: 1,
        ordemNaFamilia: 2,
        quantidade: { caixas: 30, pacotes: 0, unidades: 0, kg: 0 },
      }),
      record({
        cliente: 'Valepan',
        produto: 'HB Brioche 65g',
        tipoEstoqueId: 'tipo-1',
        produtoId: 'p2',
        produtoFamiliaId: 'fam-1',
        produtoFamiliaNome: 'HB Brioche',
        ordemFamilia: 1,
        ordemNaFamilia: 1,
        quantidade: { caixas: 190, pacotes: 0, unidades: 0, kg: 0 },
      }),
      record({
        cliente: 'Top Alto',
        produto: 'Produto X',
        tipoEstoqueId: 'tipo-2',
        produtoId: 'p3',
        quantidade: { caixas: 5, pacotes: 0, unidades: 0, kg: 0 },
      }),
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0].tipoEstoqueNome).toBe('Valepan');
    expect(tree[1].tipoEstoqueNome).toBe('Top Alto');
    expect(tree[0].total.caixas).toBe(220);

    const brioche = tree[0].familias.find((f) => f.familiaNome === 'HB Brioche');
    expect(brioche?.total.caixas).toBe(220);
    expect(brioche?.produtos).toHaveLength(2);
    expect(brioche?.produtos[0].produto).toBe('HB Brioche 65g');
    expect(brioche?.produtos[1].produto).toBe('HB Brioche 60g');
  });

  it('coloca produtos sem família no bucket Sem família', () => {
    const tree = buildStockTree([
      record({
        cliente: 'Valepan',
        produto: 'Avulso',
        tipoEstoqueId: 'tipo-1',
        quantidade: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
      }),
    ]);

    expect(tree[0].familias).toHaveLength(1);
    expect(tree[0].familias[0].familiaNome).toBe(SEM_FAMILIA_LABEL);
    expect(tree[0].familias[0].familiaId).toBeNull();
  });

  it('inclui produtos com quantidade zerada', () => {
    const tree = buildStockTree([
      record({
        cliente: 'Valepan',
        produto: 'Zerado',
        tipoEstoqueId: 'tipo-1',
        produtoId: 'p-zero',
        quantidade: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
      }),
      record({
        cliente: 'Valepan',
        produto: 'Com estoque',
        tipoEstoqueId: 'tipo-1',
        produtoId: 'p1',
        quantidade: { caixas: 5, pacotes: 0, unidades: 0, kg: 0 },
      }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].total.caixas).toBe(5);
    expect(tree[0].familias[0].produtos).toHaveLength(2);
    expect(tree[0].familias[0].produtos.some((p) => p.produto === 'Zerado')).toBe(
      true,
    );
  });

  it('ordena tipos e famílias por estoque (cx desc, pct desc)', () => {
    const tree = buildStockTree([
      record({
        cliente: 'Top Alto',
        produto: 'P1',
        tipoEstoqueId: 't2',
        quantidade: { caixas: 10, pacotes: 0, unidades: 0, kg: 0 },
      }),
      record({
        cliente: 'Valepan',
        produto: 'P2',
        tipoEstoqueId: 't1',
        produtoFamiliaId: 'f1',
        produtoFamiliaNome: 'Família A',
        quantidade: { caixas: 50, pacotes: 0, unidades: 0, kg: 0 },
      }),
      record({
        cliente: 'Valepan',
        produto: 'P3',
        tipoEstoqueId: 't1',
        produtoFamiliaId: 'f2',
        produtoFamiliaNome: 'Família B',
        quantidade: { caixas: 20, pacotes: 0, unidades: 0, kg: 0 },
      }),
    ]);

    expect(tree[0].tipoEstoqueNome).toBe('Valepan');
    expect(tree[1].tipoEstoqueNome).toBe('Top Alto');
    expect(tree[0].familias[0].familiaNome).toBe('Família A');
    expect(tree[0].familias[1].familiaNome).toBe('Família B');
  });

  it('desempata famílias e tipos por pacotes quando caixas iguais', () => {
    const tree = buildStockTree([
      record({
        cliente: 'Damião',
        produto: 'P1',
        tipoEstoqueId: 't1',
        produtoFamiliaId: 'f1',
        produtoFamiliaNome: 'Menos pct',
        quantidade: { caixas: 10, pacotes: 5, unidades: 0, kg: 0 },
      }),
      record({
        cliente: 'Damião',
        produto: 'P2',
        tipoEstoqueId: 't1',
        produtoFamiliaId: 'f2',
        produtoFamiliaNome: 'Mais pct',
        quantidade: { caixas: 10, pacotes: 20, unidades: 0, kg: 0 },
      }),
      record({
        cliente: 'Valepan',
        produto: 'P3',
        tipoEstoqueId: 't2',
        produtoFamiliaId: 'f3',
        produtoFamiliaNome: 'Tipo menor',
        quantidade: { caixas: 10, pacotes: 1, unidades: 0, kg: 0 },
      }),
    ]);

    expect(tree[0].tipoEstoqueNome).toBe('Damião');
    expect(tree[0].familias[0].familiaNome).toBe('Mais pct');
    expect(tree[0].familias[1].familiaNome).toBe('Menos pct');
  });
});

describe('pruneEmptyStockTree', () => {
  it('remove tipos e famílias sem produtos', () => {
    const tree = pruneEmptyStockTree([
      {
        tipoEstoqueId: 't-vazio',
        tipoEstoqueNome: 'Sem produtos',
        total: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
        familias: [],
      },
      {
        tipoEstoqueId: 't1',
        tipoEstoqueNome: 'Valepan',
        total: { caixas: 5, pacotes: 0, unidades: 0, kg: 0 },
        familias: [
          {
            familiaId: 'f1',
            familiaNome: 'Com produtos',
            familiaImagemUrl: null,
            ordemFamilia: 1,
            total: { caixas: 5, pacotes: 0, unidades: 0, kg: 0 },
            produtos: [
              {
                produto: 'Produto A',
                quantidade: { caixas: 5, pacotes: 0, unidades: 0, kg: 0 },
              },
            ],
          },
          {
            familiaId: 'f2',
            familiaNome: 'Sem produtos',
            familiaImagemUrl: null,
            ordemFamilia: 2,
            total: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
            produtos: [],
          },
        ],
      },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].tipoEstoqueNome).toBe('Valepan');
    expect(tree[0].familias).toHaveLength(1);
    expect(tree[0].familias[0].familiaNome).toBe('Com produtos');
  });
});

describe('filterStockTree', () => {
  const baseTree = buildStockTree([
    record({
      cliente: 'Valepan',
      produto: 'HB Brioche 65g',
      tipoEstoqueId: 't1',
      produtoFamiliaId: 'f1',
      produtoFamiliaNome: 'HB Brioche',
      ordemFamilia: 1,
    }),
    record({
      cliente: 'Damião',
      produto: 'Outro',
      tipoEstoqueId: 't2',
    }),
  ]);

  it('filtra por nome de produto', () => {
    const filtered = filterStockTree(baseTree, 'brioche');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].tipoEstoqueNome).toBe('Valepan');
    expect(filtered[0].familias[0].produtos).toHaveLength(1);
  });

  it('filtra por nome de tipo', () => {
    const filtered = filterStockTree(baseTree, 'damião');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].tipoEstoqueNome).toBe('Damião');
  });

  it('retorna árvore completa sem termo', () => {
    expect(filterStockTree(baseTree, '')).toEqual(baseTree);
  });
});

describe('extractProductVariationLabel', () => {
  it('extrai gramatura do nome do produto', () => {
    expect(extractProductVariationLabel('HB Brioche 65g', 'HB Brioche')).toBe(
      '65g',
    );
  });

  it('remove prefixo da família quando não há gramatura', () => {
    expect(
      extractProductVariationLabel('HB Gergelim Tradicional', 'HB Gergelim'),
    ).toBe('Tradicional');
  });

  it('retorna nome completo como fallback', () => {
    expect(extractProductVariationLabel('Produto Avulso', 'Sem família')).toBe(
      'Produto Avulso',
    );
  });

  it('sem família usa nome do produto mesmo com gramatura no nome', () => {
    expect(
      extractProductVariationLabel('HB Especial 50g', 'Sem família'),
    ).toBe('HB Especial 50g');
  });
});

describe('countProductsInTree', () => {
  it('conta produtos em todos os níveis', () => {
    const tree = buildStockTree([
      record({ cliente: 'Valepan', produto: 'A', tipoEstoqueId: 't1' }),
      record({ cliente: 'Valepan', produto: 'B', tipoEstoqueId: 't1' }),
      record({ cliente: 'Damião', produto: 'C', tipoEstoqueId: 't2' }),
    ]);
    expect(countProductsInTree(tree)).toBe(3);
  });
});
