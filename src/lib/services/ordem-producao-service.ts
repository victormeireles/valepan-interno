import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { aggregatePedidosFromSheetRows } from '@/domain/embalagem/map-sheet-rows-to-pedidos';
import { keysEqual, pedidoKeyToString } from '@/domain/embalagem/pedido-key';
import {
  enumerateDatesInclusive,
  type PedidoSyncWindow,
} from '@/domain/embalagem/sync-pedido-window';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
import type { OrdemProducaoKey } from '@/domain/types/ordem-producao';
import { readSheetValues } from '@/lib/googleSheets';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
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

export class OrdemProducaoService {
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

  async resolveAssadeiraDefault(produtoId: string): Promise<{
    assadeiraId: string;
    unidadesPorAssadeiraEfetiva: number;
    boxUnits: number | null;
  }> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: link, error } = await supabase
      .from('produto_assadeiras')
      .select('assadeira_id, unidades_por_assadeira, produtos(box_units), assadeiras(unidades_por_assadeira)')
      .eq('produto_id', produtoId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !link) throw new EstoqueResolverError(`Produto sem assadeira: ${produtoId}`);
    const row = link as unknown as {
      assadeira_id: string;
      unidades_por_assadeira: number | null;
      produtos: { box_units: number | null } | null;
      assadeiras: { unidades_por_assadeira: number | null } | null;
    };
    const fator = resolveUnidadesPorAssadeiraEfetiva({
      produto: row.unidades_por_assadeira,
      assadeira: row.assadeiras?.unidades_por_assadeira,
    });
    if (!fator) throw new EstoqueResolverError(`Fator assadeira inválido: ${produtoId}`);
    return {
      assadeiraId: row.assadeira_id,
      unidadesPorAssadeiraEfetiva: fator,
      boxUnits: row.produtos?.box_units ?? null,
    };
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
      resolveAssadeira: ({ produtoId }) => this.resolveAssadeiraDefault(produtoId),
      onResolveError: (row, msg) =>
        resolveErrors.push(`linha ${row}: ${msg}`),
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
      const existing = await ordemProducaoRepository.listByDataProducao(
        dataProducao,
      );
      const deleted = existing.filter((row) =>
        !keepKeys.some((k) =>
          keysEqual(k, {
            dataProducao: row.dataProducao,
            dataFabricacaoEtiqueta: row.dataFabricacaoEtiqueta,
            tipoEstoqueId: row.tipoEstoqueId,
            produtoId: row.produtoId,
            observacao: row.observacao,
            assadeiraId: row.assadeiraId,
          })
        )
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
    key: OrdemProducaoKey,
  ): Promise<string | null> {
    const found = await ordemProducaoRepository.findByKey(key);
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

export const ordemProducaoService = new OrdemProducaoService();
