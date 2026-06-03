import type { Quantidade } from '@/domain/types/inventario';
import { criarQuantidadeZerada } from './quantidade-calculo';

export type EstoqueSnapshotEntry = {
  tipoEstoque: string;
  produto: string;
  quantidade: Quantidade;
};

export type ReconcileDiffKind =
  | 'only_in_sheet'
  | 'only_in_database'
  | 'quantity_mismatch';

export type ReconcileDiff = {
  kind: ReconcileDiffKind;
  tipoEstoque: string;
  produto: string;
  sheet?: Quantidade;
  database?: Quantidade;
};

export type UnresolvedSheetRow = {
  tipoEstoque: string;
  produto: string;
  reason: string;
};

export type ReconcileResult = {
  diffs: ReconcileDiff[];
  unresolvedSheetRows: UnresolvedSheetRow[];
  sheetCount: number;
  databaseCount: number;
  matchingCount: number;
};

export function snapshotKey(tipoEstoque: string, produto: string): string {
  return `${tipoEstoque.trim()}|${produto.trim()}`;
}

export function normalizeQuantidade(q: Quantidade): Quantidade {
  return {
    caixas: Math.trunc(q.caixas || 0),
    pacotes: Math.trunc(q.pacotes || 0),
    unidades: Math.trunc(q.unidades || 0),
    kg: parseFloat((q.kg || 0).toFixed(3)),
  };
}

export function quantidadesIguais(a: Quantidade, b: Quantidade): boolean {
  const na = normalizeQuantidade(a);
  const nb = normalizeQuantidade(b);
  return (
    na.caixas === nb.caixas &&
    na.pacotes === nb.pacotes &&
    na.unidades === nb.unidades &&
    na.kg === nb.kg
  );
}

/** Consolida linhas duplicadas (mesmo tipo + produto) somando quantidades. */
export function consolidateSnapshotEntries(
  entries: EstoqueSnapshotEntry[],
): EstoqueSnapshotEntry[] {
  const map = new Map<string, EstoqueSnapshotEntry>();

  for (const entry of entries) {
    const tipo = entry.tipoEstoque.trim();
    const produto = entry.produto.trim();
    if (!tipo || !produto) continue;

    const key = snapshotKey(tipo, produto);
    const existente = map.get(key);

    if (!existente) {
      map.set(key, {
        tipoEstoque: tipo,
        produto,
        quantidade: normalizeQuantidade(entry.quantidade),
      });
      continue;
    }

    const q = existente.quantidade;
    const n = normalizeQuantidade(entry.quantidade);
    existente.quantidade = normalizeQuantidade({
      caixas: q.caixas + n.caixas,
      pacotes: q.pacotes + n.pacotes,
      unidades: q.unidades + n.unidades,
      kg: parseFloat((q.kg + n.kg).toFixed(3)),
    });
  }

  return Array.from(map.values());
}

export function buildSnapshotMap(
  entries: EstoqueSnapshotEntry[],
): Map<string, EstoqueSnapshotEntry> {
  const consolidated = consolidateSnapshotEntries(entries);
  return new Map(
    consolidated.map((entry) => [
      snapshotKey(entry.tipoEstoque, entry.produto),
      entry,
    ]),
  );
}

export function reconcileEstoque(
  sheetMap: Map<string, EstoqueSnapshotEntry>,
  databaseMap: Map<string, EstoqueSnapshotEntry>,
): ReconcileDiff[] {
  const diffs: ReconcileDiff[] = [];
  const allKeys = new Set([...sheetMap.keys(), ...databaseMap.keys()]);

  for (const key of allKeys) {
    const sheet = sheetMap.get(key);
    const database = databaseMap.get(key);

    if (sheet && !database) {
      diffs.push({
        kind: 'only_in_sheet',
        tipoEstoque: sheet.tipoEstoque,
        produto: sheet.produto,
        sheet: sheet.quantidade,
      });
      continue;
    }

    if (database && !sheet) {
      diffs.push({
        kind: 'only_in_database',
        tipoEstoque: database.tipoEstoque,
        produto: database.produto,
        database: database.quantidade,
      });
      continue;
    }

    if (sheet && database && !quantidadesIguais(sheet.quantidade, database.quantidade)) {
      diffs.push({
        kind: 'quantity_mismatch',
        tipoEstoque: sheet.tipoEstoque,
        produto: sheet.produto,
        sheet: sheet.quantidade,
        database: database.quantidade,
      });
    }
  }

  return diffs.sort((a, b) => {
    const tipo = a.tipoEstoque.localeCompare(b.tipoEstoque);
    if (tipo !== 0) return tipo;
    return a.produto.localeCompare(b.produto);
  });
}

export function buildReconcileResult(
  sheetMap: Map<string, EstoqueSnapshotEntry>,
  databaseMap: Map<string, EstoqueSnapshotEntry>,
  unresolvedSheetRows: UnresolvedSheetRow[] = [],
): ReconcileResult {
  const diffs = reconcileEstoque(sheetMap, databaseMap);

  let matchingCount = 0;
  for (const key of sheetMap.keys()) {
    if (!databaseMap.has(key)) continue;
    const sheet = sheetMap.get(key)!;
    const database = databaseMap.get(key)!;
    if (quantidadesIguais(sheet.quantidade, database.quantidade)) {
      matchingCount += 1;
    }
  }

  return {
    diffs,
    unresolvedSheetRows,
    sheetCount: sheetMap.size,
    databaseCount: databaseMap.size,
    matchingCount,
  };
}

export function hasReconcileIssues(result: ReconcileResult): boolean {
  return result.diffs.length > 0 || result.unresolvedSheetRows.length > 0;
}

export function formatQuantidadeResumo(q: Quantidade): string {
  const n = normalizeQuantidade(q);
  return `cx ${n.caixas} · pct ${n.pacotes} · un ${n.unidades} · kg ${n.kg}`;
}

export function formatReconcileReport(result: ReconcileResult): string {
  const lines: string[] = [
    '=== Reconciliação estoque: planilha vs Supabase ===',
    `Planilha (consolidado): ${result.sheetCount} pares tipo×produto`,
    `Banco: ${result.databaseCount} pares tipo×produto`,
    `Idênticos: ${result.matchingCount}`,
    `Divergências: ${result.diffs.length}`,
    `Linhas planilha não resolvidas: ${result.unresolvedSheetRows.length}`,
    '',
  ];

  if (result.unresolvedSheetRows.length > 0) {
    lines.push('--- Não resolvidas (tipo ou produto ausente no Supabase) ---');
    for (const row of result.unresolvedSheetRows) {
      lines.push(`  ${row.tipoEstoque} | ${row.produto} → ${row.reason}`);
    }
    lines.push('');
  }

  if (result.diffs.length > 0) {
    lines.push('--- Divergências ---');
    for (const diff of result.diffs) {
      const label =
        diff.kind === 'only_in_sheet'
          ? 'só planilha'
          : diff.kind === 'only_in_database'
            ? 'só banco'
            : 'quantidade diferente';
      lines.push(`[${label}] ${diff.tipoEstoque} | ${diff.produto}`);
      if (diff.sheet) lines.push(`    planilha: ${formatQuantidadeResumo(diff.sheet)}`);
      if (diff.database) lines.push(`    banco:    ${formatQuantidadeResumo(diff.database)}`);
    }
  } else if (result.unresolvedSheetRows.length === 0) {
    lines.push('Nenhuma divergência encontrada.');
  }

  return lines.join('\n');
}

export { criarQuantidadeZerada };
