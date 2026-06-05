import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { aggregatePedidosFromSheetRows } from '@/domain/embalagem/map-sheet-rows-to-pedidos';
import { pedidoKeyToString } from '@/domain/embalagem/pedido-key';
import type { PedidoEmbalagemKey } from '@/domain/types/pedido-embalagem';
import {
  enumerateDatesInclusive,
  type PedidoSyncWindow,
} from '@/domain/embalagem/sync-pedido-window';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import { readSheetValues } from '@/lib/googleSheets';
import {
  estoqueResolverService,
  EstoqueResolverError,
} from '@/lib/services/estoque-resolver-service';

export { EstoqueResolverError };

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

export class PedidoEmbalagemService {
  async resolveIds(
    cliente: string,
    produto: string,
  ): Promise<{ tipoEstoqueId: string; produtoId: string }> {
    const tipoEstoqueId = await estoqueResolverService.resolveTipoEstoqueFromCliente(
      cliente,
    );
    const produtoId = await estoqueResolverService.resolveProdutoId(produto);
    return { tipoEstoqueId, produtoId };
  }

  async validatePayloadItems(
    cliente: string,
    produtos: string[],
  ): Promise<void> {
    for (const produto of produtos) {
      await this.resolveIds(cliente, produto);
    }
  }

  private async readPedidoSheetRows(): Promise<(string | number)[][]> {
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const rows = await readSheetValues(spreadsheetId, `${tabName}!A:J`);
    return rows.slice(1);
  }

  async reconcileForDate(
    dataProducao: string,
    options?: { dryRun?: boolean },
  ): Promise<ReconcilePedidoResult> {
    const resolveErrors: string[] = [];
    const dataRows = await this.readPedidoSheetRows();

    const map = await aggregatePedidosFromSheetRows(dataRows, {
      dataProducaoFilter: dataProducao,
      resolveIds: (c, p) => this.resolveIds(c, p),
      onResolveError: (row, msg) =>
        resolveErrors.push(`linha ${row}: ${msg}`),
    });

    const pedidos = [...map.values()];
    const keepKeys: PedidoEmbalagemKey[] = pedidos.map((p) => ({
      dataProducao: p.dataProducao,
      dataFabricacaoEtiqueta: p.dataFabricacaoEtiqueta,
      tipoEstoqueId: p.tipoEstoqueId,
      produtoId: p.produtoId,
      observacao: p.observacao,
    }));

    if (options?.dryRun) {
      const existing = await pedidoEmbalagemRepository.listByDataProducao(
        dataProducao,
      );
      const deleted = existing.filter(
        (row) => !keepKeys.some((k) =>
          k.dataProducao === row.dataProducao &&
          k.dataFabricacaoEtiqueta === row.dataFabricacaoEtiqueta &&
          k.tipoEstoqueId === row.tipoEstoqueId &&
          k.produtoId === row.produtoId &&
          k.observacao === row.observacao,
        ),
      ).length;
      return {
        dataProducao,
        upserted: pedidos.length,
        deleted,
        resolveErrors,
      };
    }

    await pedidoEmbalagemRepository.upsertMany(pedidos);
    const deleted = await pedidoEmbalagemRepository.deleteForDateExceptKeys(
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

  async reconcileForDates(
    dates: string[],
    options?: { dryRun?: boolean },
  ): Promise<ReconcilePedidoResult[]> {
    const results: ReconcilePedidoResult[] = [];
    for (const date of dates) {
      results.push(await this.reconcileForDate(date, options));
    }
    return results;
  }

  async resolvePedidoEmbalagemId(
    key: PedidoEmbalagemKey,
  ): Promise<string | null> {
    let found = await pedidoEmbalagemRepository.findByKey(key);
    if (found) return found.id;

    try {
      await this.reconcileForDate(key.dataProducao);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[resolvePedidoEmbalagemId] reconcile falhou para ${key.dataProducao}:`,
        message,
      );
    }

    found = await pedidoEmbalagemRepository.findByKey(key);
    if (!found) {
      console.warn(
        `[resolvePedidoEmbalagemId] pedido não encontrado: ${pedidoKeyToString(key)}`,
      );
      return null;
    }

    return found.id;
  }

  async reconcileWindow(
    window: PedidoSyncWindow,
    options?: { dryRun?: boolean },
  ): Promise<ReconcileWindowResult> {
    const dates = enumerateDatesInclusive(window.from, window.to);
    const byDate = await this.reconcileForDates(dates, options);

    return {
      days: dates.length,
      totalUpserted: byDate.reduce((s, r) => s + r.upserted, 0),
      totalDeleted: byDate.reduce((s, r) => s + r.deleted, 0),
      resolveErrors: byDate.flatMap((r) => r.resolveErrors),
      byDate,
    };
  }
}

export const pedidoEmbalagemService = new PedidoEmbalagemService();
