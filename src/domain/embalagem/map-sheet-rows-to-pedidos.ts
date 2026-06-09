import type {
  AggregatedPedidoFromSheet,
  PedidoEmbalagemUpsert,
} from '@/domain/types/pedido-embalagem';
import { mergeOrdemIntoMap, normalizeObservacao, pedidoKeyToString } from '@/domain/embalagem/pedido-key';
import { quantidadeTemSaldoPedido } from '@/domain/embalagem/painel-quantidade';
import { PEDIDO_SHEET_COL, PRODUCAO_SHEET_COL } from '@/domain/embalagem/pedido-sheet-cols';
import {
  assadeirasFromSheetQuantidade,
  deriveQuantidadesFromAssadeiras,
} from '@/domain/producao/ordem-derivados';
function strictISODate(value: unknown): string {
  if (value == null) return '';
  const str = value.toString().trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return '';
}

export type ResolvePedidoIds = (
  cliente: string,
  produto: string,
) => Promise<{ tipoEstoqueId: string; produtoId: string }>;

export type ResolveAssadeira = (ctx: {
  produtoId: string;
}) => Promise<{
  assadeiraId: string;
  unidadesPorAssadeiraEfetiva: number;
  boxUnits: number | null;
}>;

export type MapSheetPedidosOptions = {
  dataProducaoFilter?: string;
  resolveIds: ResolvePedidoIds;
  resolveAssadeira: ResolveAssadeira;
  onResolveError?: (rowNumber: number, message: string) => void;
};

export function rowToPedidoQuantidade(row: (string | number)[]) {
  return {
    caixas: Number(row[PEDIDO_SHEET_COL.pedidoCaixas] || 0) || 0,
    pacotes: Number(row[PEDIDO_SHEET_COL.pedidoPacotes] || 0) || 0,
    unidades: Number(row[PEDIDO_SHEET_COL.pedidoUnidades] || 0) || 0,
    kg: Number(row[PEDIDO_SHEET_COL.pedidoKg] || 0) || 0,
  };
}

export function rowToProducaoQuantidade(row: (string | number)[]) {
  return {
    caixas: Number(row[PRODUCAO_SHEET_COL.caixas] || 0) || 0,
    pacotes: Number(row[PRODUCAO_SHEET_COL.pacotes] || 0) || 0,
    unidades: Number(row[PRODUCAO_SHEET_COL.unidades] || 0) || 0,
    kg: Number(row[PRODUCAO_SHEET_COL.kg] || 0) || 0,
  };
}

/** Linha de lote parcial legado: G–J repetem M–P (não é meta). */
export function isLinhaRealizadoDuplicandoMeta(
  row: (string | number)[],
  rowNumber: number,
  primaryMetaRowNumber: number | undefined,
): boolean {
  if (primaryMetaRowNumber === undefined || rowNumber === primaryMetaRowNumber) {
    return false;
  }
  const pedido = rowToPedidoQuantidade(row);
  const produzido = rowToProducaoQuantidade(row);
  const temProduzido =
    produzido.caixas + produzido.pacotes + produzido.unidades + Number(produzido.kg) > 0;
  if (!temProduzido || !quantidadeTemSaldoPedido(pedido)) return false;
  return (
    pedido.caixas === produzido.caixas &&
    pedido.pacotes === produzido.pacotes &&
    pedido.unidades === produzido.unidades &&
    Number(pedido.kg) === Number(produzido.kg)
  );
}

type SheetRowCandidate = {
  row: (string | number)[];
  rowNumber: number;
  key: string;
  ordem: PedidoEmbalagemUpsert;
  mergeCtx: { unidadesPorAssadeira: number; boxUnits: number | null };
};

export async function aggregatePedidosFromSheetRows(
  dataRows: (string | number)[][],
  options: MapSheetPedidosOptions,
  rowOffset = 2,
): Promise<Map<string, AggregatedPedidoFromSheet>> {
  const map = new Map<string, AggregatedPedidoFromSheet>();
  const candidates: SheetRowCandidate[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + rowOffset;
    const dataProducao = strictISODate(row[PEDIDO_SHEET_COL.dataProducao]);
    if (!dataProducao) continue;

    if (
      options.dataProducaoFilter &&
      dataProducao !== options.dataProducaoFilter
    ) {
      continue;
    }

    const dataFabricacaoEtiqueta = strictISODate(
      row[PEDIDO_SHEET_COL.dataFabricacaoEtiqueta],
    );
    if (!dataFabricacaoEtiqueta) continue;

    const cliente = (row[PEDIDO_SHEET_COL.cliente] || '').toString().trim();
    const produto = (row[PEDIDO_SHEET_COL.produto] || '').toString().trim();
    if (!cliente || !produto) continue;

    let resolved: { tipoEstoqueId: string; produtoId: string };
    try {
      resolved = await options.resolveIds(cliente, produto);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao resolver IDs';
      options.onResolveError?.(rowNumber, message);
      continue;
    }

    const { assadeiraId, unidadesPorAssadeiraEfetiva: fator, boxUnits } =
      await options.resolveAssadeira({
        produtoId: resolved.produtoId,
      });

    const sheetQ = rowToPedidoQuantidade(row);
    if (!quantidadeTemSaldoPedido(sheetQ)) continue;

    const assadeiras = assadeirasFromSheetQuantidade(sheetQ, {
      unidadesPorAssadeira: fator,
      boxUnits,
    });
    const ordem: PedidoEmbalagemUpsert = {
      dataProducao,
      dataFabricacaoEtiqueta,
      tipoEstoqueId: resolved.tipoEstoqueId,
      produtoId: resolved.produtoId,
      observacao: normalizeObservacao(row[PEDIDO_SHEET_COL.observacao]),
      assadeiraId,
      assadeiras,
      ordemPlanejamento: 0,
      quantidade: deriveQuantidadesFromAssadeiras({
        assadeiras,
        unidadesPorAssadeira: fator,
        boxUnits,
      }),
    };

    candidates.push({
      row,
      rowNumber,
      key: pedidoKeyToString(ordem),
      ordem,
      mergeCtx: { unidadesPorAssadeira: fator, boxUnits },
    });
  }

  const primaryMetaRowByKey = new Map<string, number>();
  for (const candidate of candidates) {
    const prev = primaryMetaRowByKey.get(candidate.key);
    if (prev === undefined || candidate.rowNumber < prev) {
      primaryMetaRowByKey.set(candidate.key, candidate.rowNumber);
    }
  }

  for (const candidate of candidates) {
    if (
      isLinhaRealizadoDuplicandoMeta(
        candidate.row,
        candidate.rowNumber,
        primaryMetaRowByKey.get(candidate.key),
      )
    ) {
      continue;
    }
    mergeOrdemIntoMap(map, candidate.ordem, candidate.mergeCtx);
  }

  return map;
}
