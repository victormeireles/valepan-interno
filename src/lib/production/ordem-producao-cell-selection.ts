import type { OrdemProducaoDiariaItemView } from '@/app/actions/producao-actions';

/** Colunas numéricas que podem entrar na soma interativa. */
export type OrdemSumColumn = 'latas' | 'caixas';

export type OrdemCellKey = `${string}:${OrdemSumColumn}`;

export function ordemCellKey(itemId: string, column: OrdemSumColumn): OrdemCellKey {
  return `${itemId}:${column}`;
}

export function parseOrdemCellKey(key: string): { itemId: string; column: OrdemSumColumn } | null {
  const sep = key.lastIndexOf(':');
  if (sep < 1) return null;
  const column = key.slice(sep + 1);
  if (column !== 'latas' && column !== 'caixas') return null;
  return { itemId: key.slice(0, sep), column };
}

export function valorCelulaOrdem(item: OrdemProducaoDiariaItemView, column: OrdemSumColumn): number {
  const raw = column === 'latas' ? item.latasPlanejadas : item.caixasEstimadas;
  const n = Math.round(Number(raw) || 0);
  return n > 0 ? n : 0;
}

export function somarCelulasSelecionadas(
  items: OrdemProducaoDiariaItemView[],
  selected: ReadonlySet<OrdemCellKey>,
): { count: number; latas: number; caixas: number } {
  const byId = new Map(items.map((i) => [i.id, i]));
  let count = 0;
  let latas = 0;
  let caixas = 0;
  for (const key of selected) {
    const parsed = parseOrdemCellKey(key);
    if (!parsed) continue;
    const item = byId.get(parsed.itemId);
    if (!item) continue;
    const v = valorCelulaOrdem(item, parsed.column);
    count += 1;
    if (parsed.column === 'latas') latas += v;
    else caixas += v;
  }
  return { count, latas, caixas };
}

/** Índices de linha (0-based) entre dois ids na lista ordenada. */
export function intervaloIndicesLinhas(
  itemIds: string[],
  aId: string,
  bId: string,
): [number, number] | null {
  const ia = itemIds.indexOf(aId);
  const ib = itemIds.indexOf(bId);
  if (ia < 0 || ib < 0) return null;
  return ia <= ib ? [ia, ib] : [ib, ia];
}

export function chavesIntervaloColuna(
  itemIds: string[],
  column: OrdemSumColumn,
  fromId: string,
  toId: string,
): OrdemCellKey[] {
  const range = intervaloIndicesLinhas(itemIds, fromId, toId);
  if (!range) return [];
  const [lo, hi] = range;
  const out: OrdemCellKey[] = [];
  for (let i = lo; i <= hi; i++) {
    out.push(ordemCellKey(itemIds[i]!, column));
  }
  return out;
}

export interface TotaisOrdemDiariaDia {
  latas: number;
  caixas: number;
  itens: number;
}

export function totaisOrdemDiariaDia(
  itens: Pick<OrdemProducaoDiariaItemView, 'latasPlanejadas' | 'caixasEstimadas'>[],
): TotaisOrdemDiariaDia {
  let latas = 0;
  let caixas = 0;
  for (const it of itens) {
    latas += Math.max(0, Math.round(Number(it.latasPlanejadas) || 0));
    caixas += Math.max(0, Math.round(Number(it.caixasEstimadas) || 0));
  }
  return { latas, caixas, itens: itens.length };
}
