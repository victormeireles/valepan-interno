/**
 * Reconcile planilha → Supabase (script manual apenas).
 * Não usar em runtime do app — meta/realizado embalagem são DB-only.
 */
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { aggregatePedidosFromSheetRows } from '@/domain/embalagem/map-sheet-rows-to-pedidos';
import { keysEqual } from '@/domain/embalagem/pedido-key';
import {
  enumerateDatesInclusive,
  type PedidoSyncWindow,
} from '@/domain/embalagem/sync-pedido-window';
import type { OrdemProducaoKey } from '@/domain/types/ordem-producao';
import { readSheetValues } from '@/lib/googleSheets';
import { ordemProducaoService } from '@/lib/services/ordem-producao-service';

/** Aba legada — só para script `sync-ordens-producao-from-sheet.ts`. */
export const EMBALAGEM_PEDIDOS_SHEET = {
  spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
  tabName: 'Pedido de embalagem',
} as const;

export type ReconcilePedidoResult = {
  dataProducao: string;
  upserted: number;
  deleted: number;
  resolveErrors: string[];
};

export type ReconcileWindowResult = {
  days: number;
  totalUpserted: number;
  totalDeleted: number;
  resolveErrors: string[];
  byDate: ReconcilePedidoResult[];
};

async function readPedidoSheetRows(): Promise<(string | number)[][]> {
  const { spreadsheetId, tabName } = EMBALAGEM_PEDIDOS_SHEET;
  const rows = await readSheetValues(spreadsheetId, `${tabName}!A:J`);
  return rows.slice(1);
}

export async function reconcileOrdensProducaoForDate(
  dataProducao: string,
  options?: { dryRun?: boolean },
): Promise<ReconcilePedidoResult> {
  const resolveErrors: string[] = [];
  const dataRows = await readPedidoSheetRows();

  const map = await aggregatePedidosFromSheetRows(dataRows, {
    dataProducaoFilter: dataProducao,
    resolveIds: (c, p) => ordemProducaoService.resolveIds(c, p),
    resolveAssadeira: ({ produtoId }) =>
      ordemProducaoService.resolveAssadeiraDefault(produtoId),
    onResolveError: (row, msg) => resolveErrors.push(`linha ${row}: ${msg}`),
  });

  const pedidos = [...map.values()];
  const keepKeys: OrdemProducaoKey[] = pedidos.map((p) => ({
    dataProducao: p.dataProducao,
    dataFabricacaoEtiqueta: p.dataFabricacaoEtiqueta,
    tipoEstoqueId: p.tipoEstoqueId,
    produtoId: p.produtoId,
    observacao: p.observacao,
    assadeiraId: p.assadeiraId,
  }));

  if (options?.dryRun) {
    const existing = await ordemProducaoRepository.listByDataProducao(dataProducao);
    const deleted = existing.filter(
      (row) =>
        !keepKeys.some((k) =>
          keysEqual(k, {
            dataProducao: row.dataProducao,
            dataFabricacaoEtiqueta: row.dataFabricacaoEtiqueta,
            tipoEstoqueId: row.tipoEstoqueId,
            produtoId: row.produtoId,
            observacao: row.observacao,
            assadeiraId: row.assadeiraId,
          }),
        ),
    ).length;
    return {
      dataProducao,
      upserted: pedidos.length,
      deleted,
      resolveErrors,
    };
  }

  await ordemProducaoRepository.upsertMany(pedidos);
  const deleted = await ordemProducaoRepository.deleteForDateExceptKeys(
    dataProducao,
    keepKeys,
  );

  return {
    dataProducao,
    upserted: pedidos.length,
    deleted,
    resolveErrors,
  };
}

export async function reconcileOrdensProducaoForDates(
  dates: string[],
  options?: { dryRun?: boolean },
): Promise<ReconcilePedidoResult[]> {
  const results: ReconcilePedidoResult[] = [];
  for (const date of dates) {
    results.push(await reconcileOrdensProducaoForDate(date, options));
  }
  return results;
}

export async function reconcileOrdensProducaoWindow(
  window: PedidoSyncWindow,
  options?: { dryRun?: boolean },
): Promise<ReconcileWindowResult> {
  const dates = enumerateDatesInclusive(window.from, window.to);
  const byDate = await reconcileOrdensProducaoForDates(dates, options);

  return {
    days: dates.length,
    totalUpserted: byDate.reduce((s, r) => s + r.upserted, 0),
    totalDeleted: byDate.reduce((s, r) => s + r.deleted, 0),
    resolveErrors: byDate.flatMap((r) => r.resolveErrors),
    byDate,
  };
}
