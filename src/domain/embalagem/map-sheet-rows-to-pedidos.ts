import type {
  AggregatedPedidoFromSheet,
  PedidoEmbalagemUpsert,
} from '@/domain/types/pedido-embalagem';
import { mergeOrdemIntoMap, normalizeObservacao } from '@/domain/embalagem/pedido-key';
import { PEDIDO_SHEET_COL } from '@/domain/embalagem/pedido-sheet-cols';
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

export async function aggregatePedidosFromSheetRows(
  dataRows: (string | number)[][],
  options: MapSheetPedidosOptions,
  rowOffset = 2,
): Promise<Map<string, AggregatedPedidoFromSheet>> {
  const map = new Map<string, AggregatedPedidoFromSheet>();

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

    mergeOrdemIntoMap(map, ordem, {
      unidadesPorAssadeira: fator,
      boxUnits,
    });
  }

  return map;
}
