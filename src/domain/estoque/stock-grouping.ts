import type { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import { criarQuantidadeZerada, somarQuantidades } from './quantidade-calculo';
import { isQuantidadeZerada } from '@/lib/utils/quantidade-formatter';

export const SEM_FAMILIA_LABEL = 'Sem família';

export interface StockProductItem {
  produto: string;
  quantidade: Quantidade;
  tipoEstoqueId?: string;
  produtoId?: string;
  produtoFamiliaId?: string | null;
  produtoFamiliaNome?: string | null;
  ordemFamilia?: number;
  ordemNaFamilia?: number;
}

export interface StockFamilyGroup {
  familiaId: string | null;
  familiaNome: string;
  familiaImagemUrl: string | null;
  ordemFamilia: number;
  total: Quantidade;
  produtos: StockProductItem[];
}

export interface StockTipoNode {
  tipoEstoqueId: string;
  tipoEstoqueNome: string;
  total: Quantidade;
  familias: StockFamilyGroup[];
}

type ProductAgg = {
  quantidade: Quantidade;
  tipoEstoqueId?: string;
  produtoId?: string;
  produtoFamiliaId?: string | null;
  produtoFamiliaNome?: string | null;
  produtoFamiliaImagemUrl?: string | null;
  ordemFamilia?: number;
  ordemNaFamilia?: number;
};

function familiaKey(record: EstoqueRecord): string {
  return record.produtoFamiliaId ?? '__sem_familia__';
}

function familiaNome(record: EstoqueRecord): string {
  return record.produtoFamiliaNome?.trim() || SEM_FAMILIA_LABEL;
}

function ordemFamilia(record: EstoqueRecord): number {
  if (record.produtoFamiliaId == null) {
    return Number.MAX_SAFE_INTEGER;
  }
  return record.ordemFamilia ?? Number.MAX_SAFE_INTEGER - 1;
}

function compareProdutos(a: StockProductItem, b: StockProductItem): number {
  const ordemA = a.ordemNaFamilia ?? Number.MAX_SAFE_INTEGER;
  const ordemB = b.ordemNaFamilia ?? Number.MAX_SAFE_INTEGER;
  if (ordemA !== ordemB) return ordemA - ordemB;
  return a.produto.localeCompare(b.produto, 'pt-BR');
}

/** Maior estoque primeiro: caixas desc, desempate por pacotes desc. */
export function compareQuantidadeEstoqueDesc(
  a: Quantidade,
  b: Quantidade,
): number {
  if (b.caixas !== a.caixas) return b.caixas - a.caixas;
  return b.pacotes - a.pacotes;
}

function compareFamiliasByEstoque(a: StockFamilyGroup, b: StockFamilyGroup): number {
  const byQty = compareQuantidadeEstoqueDesc(a.total, b.total);
  if (byQty !== 0) return byQty;
  return a.familiaNome.localeCompare(b.familiaNome, 'pt-BR');
}

function compareTiposByEstoque(a: StockTipoNode, b: StockTipoNode): number {
  const byQty = compareQuantidadeEstoqueDesc(a.total, b.total);
  if (byQty !== 0) return byQty;
  return a.tipoEstoqueNome.localeCompare(b.tipoEstoqueNome, 'pt-BR');
}

function sortStockTree(tree: StockTipoNode[]): StockTipoNode[] {
  for (const tipo of tree) {
    tipo.familias.sort(compareFamiliasByEstoque);
  }
  tree.sort(compareTiposByEstoque);
  return tree;
}

export function buildStockTree(records: EstoqueRecord[]): StockTipoNode[] {
  const byTipo = new Map<
    string,
    {
      tipoEstoqueId: string;
      tipoEstoqueNome: string;
      byFamilia: Map<string, Map<string, ProductAgg>>;
      familiaMeta: Map<
        string,
        {
          familiaId: string | null;
          familiaNome: string;
          familiaImagemUrl: string | null;
          ordemFamilia: number;
        }
      >;
    }
  >();

  for (const record of records) {
    if (isQuantidadeZerada(record.quantidade)) continue;

    const tipoId = record.tipoEstoqueId ?? record.cliente;
    const tipoNome = record.cliente;

    if (!byTipo.has(tipoId)) {
      byTipo.set(tipoId, {
        tipoEstoqueId: record.tipoEstoqueId ?? tipoId,
        tipoEstoqueNome: tipoNome,
        byFamilia: new Map(),
        familiaMeta: new Map(),
      });
    }

    const tipoBucket = byTipo.get(tipoId)!;
    const fKey = familiaKey(record);

    if (!tipoBucket.familiaMeta.has(fKey)) {
      tipoBucket.familiaMeta.set(fKey, {
        familiaId: record.produtoFamiliaId ?? null,
        familiaNome: familiaNome(record),
        familiaImagemUrl: record.produtoFamiliaImagemUrl ?? null,
        ordemFamilia: ordemFamilia(record),
      });
    }

    if (!tipoBucket.byFamilia.has(fKey)) {
      tipoBucket.byFamilia.set(fKey, new Map());
    }

    const familiaProducts = tipoBucket.byFamilia.get(fKey)!;

    if (familiaProducts.has(record.produto)) {
      const existing = familiaProducts.get(record.produto)!;
      familiaProducts.set(record.produto, {
        quantidade: somarQuantidades(existing.quantidade, record.quantidade, true),
        tipoEstoqueId: existing.tipoEstoqueId ?? record.tipoEstoqueId,
        produtoId: existing.produtoId ?? record.produtoId,
        produtoFamiliaId: existing.produtoFamiliaId ?? record.produtoFamiliaId,
        produtoFamiliaNome: existing.produtoFamiliaNome ?? record.produtoFamiliaNome,
        produtoFamiliaImagemUrl:
          existing.produtoFamiliaImagemUrl ?? record.produtoFamiliaImagemUrl,
        ordemFamilia: existing.ordemFamilia ?? record.ordemFamilia,
        ordemNaFamilia: existing.ordemNaFamilia ?? record.ordemNaFamilia,
      });
    } else {
      familiaProducts.set(record.produto, {
        quantidade: { ...record.quantidade },
        tipoEstoqueId: record.tipoEstoqueId,
        produtoId: record.produtoId,
        produtoFamiliaId: record.produtoFamiliaId,
        produtoFamiliaNome: record.produtoFamiliaNome,
        ordemFamilia: record.ordemFamilia,
        ordemNaFamilia: record.ordemNaFamilia,
      });
    }
  }

  const tree: StockTipoNode[] = [];

  for (const tipoBucket of byTipo.values()) {
    const familias: StockFamilyGroup[] = [];
    let totalTipo = criarQuantidadeZerada();

    for (const [fKey, productsMap] of tipoBucket.byFamilia) {
      const meta = tipoBucket.familiaMeta.get(fKey)!;
      const produtos: StockProductItem[] = [];
      let totalFamilia = criarQuantidadeZerada();

      for (const [produto, agg] of productsMap) {
        produtos.push({
          produto,
          quantidade: agg.quantidade,
          tipoEstoqueId: agg.tipoEstoqueId,
          produtoId: agg.produtoId,
          produtoFamiliaId: agg.produtoFamiliaId,
          produtoFamiliaNome: agg.produtoFamiliaNome,
          ordemFamilia: agg.ordemFamilia,
          ordemNaFamilia: agg.ordemNaFamilia,
        });
        totalFamilia = somarQuantidades(totalFamilia, agg.quantidade, true);
      }

      produtos.sort(compareProdutos);

      familias.push({
        familiaId: meta.familiaId,
        familiaNome: meta.familiaNome,
        familiaImagemUrl: meta.familiaImagemUrl,
        ordemFamilia: meta.ordemFamilia,
        total: totalFamilia,
        produtos,
      });

      totalTipo = somarQuantidades(totalTipo, totalFamilia, true);
    }

    tree.push({
      tipoEstoqueId: tipoBucket.tipoEstoqueId,
      tipoEstoqueNome: tipoBucket.tipoEstoqueNome,
      total: totalTipo,
      familias,
    });
  }

  return sortStockTree(tree);
}

export function filterStockTree(
  tree: StockTipoNode[],
  searchTerm: string,
): StockTipoNode[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return tree;

  const filtered = tree
    .map((tipo) => {
      const tipoMatches = tipo.tipoEstoqueNome.toLowerCase().includes(term);

      const familias = tipo.familias
        .map((familia) => {
          const familiaMatches = familia.familiaNome.toLowerCase().includes(term);

          const produtos = familia.produtos.filter(
            (p) =>
              tipoMatches ||
              familiaMatches ||
              p.produto.toLowerCase().includes(term),
          );

          if (produtos.length === 0) return null;

          const total = produtos.reduce(
            (acc, p) => somarQuantidades(acc, p.quantidade, true),
            criarQuantidadeZerada(),
          );

          return { ...familia, produtos, total };
        })
        .filter((f): f is StockFamilyGroup => f !== null);

      if (familias.length === 0) return null;

      const total = familias.reduce(
        (acc, f) => somarQuantidades(acc, f.total, true),
        criarQuantidadeZerada(),
      );

      return { ...tipo, familias, total };
    })
    .filter((t): t is StockTipoNode => t !== null);

  return sortStockTree(filtered);
}

export function countProductsInTree(tree: StockTipoNode[]): number {
  return tree.reduce(
    (acc, tipo) =>
      acc + tipo.familias.reduce((fAcc, f) => fAcc + f.produtos.length, 0),
    0,
  );
}

/** Rótulo curto da variação (ex.: "65g") para exibição no card da família. */
export function extractProductVariationLabel(
  produto: string,
  familiaNome: string,
): string {
  if (familiaNome.trim() === SEM_FAMILIA_LABEL) {
    return produto;
  }

  const gramMatch = produto.match(/(\d+\s*g)\b/i);
  if (gramMatch) {
    return gramMatch[1].replace(/\s+/g, '');
  }

  const familia = familiaNome.trim();
  if (familia && familia !== SEM_FAMILIA_LABEL) {
    const prefix = new RegExp(`^${escapeRegExp(familia)}\\s*[-–—]?\\s*`, 'i');
    const stripped = produto.replace(prefix, '').trim();
    if (stripped && stripped !== produto) {
      return stripped;
    }
  }

  return produto;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
