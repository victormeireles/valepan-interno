import type { AssadeiraRow } from '@/app/actions/assadeiras-actions';
import type { ProdutoLatasRow } from '@/app/actions/latas-cadastro-actions';

export type EntryState = { checked: boolean; unidades: string };

export function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function extractPesoKey(text: string): string | null {
  const m = text.match(/\b(\d{1,4}(?:[.,]\d+)?)\s*g\b/i);
  if (!m) return null;
  const raw = m[1].replace(',', '.');
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const normalized = Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, '');
  return `${normalized}g`;
}

export function defaultUnidadesPorLata(assadeira: AssadeiraRow, produto: ProdutoLatasRow): string {
  const br = Math.round(Number(assadeira.numero_buracos ?? 0));
  if (br > 0) return String(br);
  if (produto.unidades_assadeira != null && Number(produto.unidades_assadeira) > 0) {
    return String(Math.round(Number(produto.unidades_assadeira)));
  }
  const ql = Number(assadeira.quantidade_latas ?? 0);
  if (Number.isFinite(ql) && ql > 0) return String(Math.round(ql));
  return '';
}

export function buildProdutoLataMapForAssadeira(
  produtos: ProdutoLatasRow[],
  assadeiraId: string,
): Record<string, EntryState> {
  const m: Record<string, EntryState> = {};
  for (const p of produtos) {
    const v = p.vinculos.find((x) => x.assadeira_id === assadeiraId);
    m[p.id] = {
      checked: !!v,
      unidades: v ? String(v.unidades_por_assadeira) : '',
    };
  }
  return m;
}

export function vinculosPayloadChanged(
  before: ProdutoLatasRow['vinculos'],
  after: { assadeiraId: string; unidadesPorAssadeira: number }[],
): boolean {
  if (before.length !== after.length) return true;
  const byId = new Map(after.map((x) => [x.assadeiraId, x.unidadesPorAssadeira]));
  for (const b of before) {
    const u = byId.get(b.assadeira_id);
    if (u !== b.unidades_por_assadeira) return true;
    byId.delete(b.assadeira_id);
  }
  return byId.size > 0;
}

export function mergeVinculosForProduto(
  p: ProdutoLatasRow,
  assadeiraId: string,
  entry: EntryState,
  assadeirasSorted: AssadeiraRow[],
): { assadeiraId: string; unidadesPorAssadeira: number }[] | 'invalid' {
  const out: { assadeiraId: string; unidadesPorAssadeira: number }[] = [];
  for (const a of assadeirasSorted) {
    if (a.id === assadeiraId) {
      if (!entry.checked) continue;
      const u = parseOptionalInt(entry.unidades);
      if (u == null) return 'invalid';
      out.push({ assadeiraId: a.id, unidadesPorAssadeira: u });
    } else {
      const v = p.vinculos.find((x) => x.assadeira_id === a.id);
      if (v) out.push({ assadeiraId: a.id, unidadesPorAssadeira: v.unidades_por_assadeira });
    }
  }
  return out;
}

export const LATAS_FIELD_CLASS =
  'w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50';
