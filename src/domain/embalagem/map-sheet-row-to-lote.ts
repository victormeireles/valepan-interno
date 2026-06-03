import type { EmbalagemLoteInsert } from '@/domain/types/embalagem-lote';
import { normalizeToISODate } from '@/lib/utils/date-utils';

/** Índices da aba Pedido de embalagem (A=0 … AC=28). */
export const SHEET_COL = {
  dataPedido: 0,
  dataFabricacao: 1,
  cliente: 2,
  produto: 4,
  congelado: 5,
  pedidoCaixas: 6,
  createdAt: 10,
  producaoCaixas: 12,
  producaoPacotes: 13,
  producaoUnidades: 14,
  producaoKg: 15,
  producaoUpdatedAt: 16,
  pacoteFotoUrl: 17,
  pacoteFotoId: 18,
  pacoteFotoUploadedAt: 19,
  etiquetaFotoUrl: 20,
  etiquetaFotoId: 21,
  etiquetaFotoUploadedAt: 22,
  palletFotoUrl: 23,
  palletFotoId: 24,
  palletFotoUploadedAt: 25,
  lote: 26,
  obsEmbalagem: 28,
} as const;

export function rowTemProducao(row: (string | number)[]): boolean {
  const c = Number(row[SHEET_COL.producaoCaixas] || 0);
  const p = Number(row[SHEET_COL.producaoPacotes] || 0);
  const u = Number(row[SHEET_COL.producaoUnidades] || 0);
  const k = Number(row[SHEET_COL.producaoKg] || 0);
  return c + p + u + k > 0;
}

export function parseProduzidoEmFromRow(row: (string | number)[]): string {
  const q = (row[SHEET_COL.producaoUpdatedAt] || '').toString().trim();
  if (q) return q;
  const k = (row[SHEET_COL.createdAt] || '').toString().trim();
  if (k) return k;
  return new Date().toISOString();
}

function parseOptionalTimestamp(value: unknown): string | undefined {
  const s = (value ?? '').toString().trim();
  return s || undefined;
}

export function mapRowToLoteInsert(
  row: (string | number)[],
  planilhaRowId: number,
  resolved: { tipoEstoqueId: string; produtoId: string },
): EmbalagemLoteInsert {
  const congeladoRaw = (row[SHEET_COL.congelado] || 'Não').toString().trim();
  const congelado = congeladoRaw === 'Sim' ? 'Sim' : 'Não';
  const loteRaw = row[SHEET_COL.lote];
  const loteNum = loteRaw !== '' && loteRaw != null ? Number(loteRaw) : null;

  return {
    modo: 'importado',
    planilhaRowId,
    dataPedido: normalizeToISODate(row[SHEET_COL.dataPedido]),
    dataFabricacao: normalizeToISODate(row[SHEET_COL.dataFabricacao]),
    tipoEstoqueId: resolved.tipoEstoqueId,
    produtoId: resolved.produtoId,
    congelado,
    lote: Number.isFinite(loteNum) ? loteNum : null,
    quantidade: {
      caixas: Number(row[SHEET_COL.producaoCaixas] || 0),
      pacotes: Number(row[SHEET_COL.producaoPacotes] || 0),
      unidades: Number(row[SHEET_COL.producaoUnidades] || 0),
      kg: Number(row[SHEET_COL.producaoKg] || 0),
    },
    produzidoEm: parseProduzidoEmFromRow(row),
    obsEmbalagem: (row[SHEET_COL.obsEmbalagem] || '').toString().trim() || null,
    fotos: {
      pacoteFotoUrl: (row[SHEET_COL.pacoteFotoUrl] || '').toString().trim() || undefined,
      pacoteFotoId: (row[SHEET_COL.pacoteFotoId] || '').toString().trim() || undefined,
      pacoteFotoUploadedAt: parseOptionalTimestamp(row[SHEET_COL.pacoteFotoUploadedAt]),
      etiquetaFotoUrl: (row[SHEET_COL.etiquetaFotoUrl] || '').toString().trim() || undefined,
      etiquetaFotoId: (row[SHEET_COL.etiquetaFotoId] || '').toString().trim() || undefined,
      etiquetaFotoUploadedAt: parseOptionalTimestamp(row[SHEET_COL.etiquetaFotoUploadedAt]),
      palletFotoUrl: (row[SHEET_COL.palletFotoUrl] || '').toString().trim() || undefined,
      palletFotoId: (row[SHEET_COL.palletFotoId] || '').toString().trim() || undefined,
      palletFotoUploadedAt: parseOptionalTimestamp(row[SHEET_COL.palletFotoUploadedAt]),
    },
  };
}
