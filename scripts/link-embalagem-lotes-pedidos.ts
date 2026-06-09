/**
 * Vincula embalagem_lotes.ordem_producao_id ao ordens_producao canônico.
 *
 * Janela: data_pedido (col A) hoje ±3 dias (fuso BR).
 * Só processa lotes com ordem_producao_id NULL.
 *
 * Uso:
 *   npx tsx scripts/link-embalagem-lotes-pedidos.ts [--dry-run]
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const { PEDIDOS_EMBALAGEM_CONFIG } = await import('../src/config/embalagem');
  const { resolvePedidoSyncWindow } = await import(
    '../src/domain/embalagem/sync-pedido-window'
  );
  const { loteToPedidoKey } = await import(
    '../src/domain/embalagem/pedido-key-from-lote'
  );
  const { normalizeObservacao } = await import('../src/domain/embalagem/pedido-key');
  const { PEDIDO_SHEET_COL } = await import(
    '../src/domain/embalagem/pedido-sheet-cols'
  );
  const { embalagemLoteRepository } = await import(
    '../src/data/embalagem/EmbalagemLoteRepository'
  );
  const { pedidoEmbalagemService } = await import(
    '../src/lib/services/pedido-embalagem-service'
  );
  const { readSheetValues } = await import('../src/lib/googleSheets');

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const dryRun = process.argv.includes('--dry-run');
  const window = resolvePedidoSyncWindow({ dryRun });

  console.log(
    `[link-embalagem-lotes-pedidos] janela ${window.from} .. ${window.to}${dryRun ? ' (dry-run)' : ''}`,
  );

  const lotes = await embalagemLoteRepository.listUnlinkedInWindow(
    window.from,
    window.to,
  );

  const stats = {
    candidatos: lotes.length,
    vinculados: 0,
    aindaNull: 0,
    semPlanilhaRowId: 0,
    errosPlanilha: 0,
    errosUpdate: 0,
  };

  const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;

  const sheetRows = await readSheetValues(spreadsheetId, `${tabName}!A:J`);
  const observacaoPorLinha = new Map<number, string>();
  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    observacaoPorLinha.set(
      i + 1,
      normalizeObservacao(row[PEDIDO_SHEET_COL.observacao]),
    );
  }

  for (const lote of lotes) {
    if (!lote.planilhaRowId) {
      stats.semPlanilhaRowId += 1;
      console.warn(`[link] lote ${lote.id} sem planilha_row_id`);
      continue;
    }

    if (!observacaoPorLinha.has(lote.planilhaRowId)) {
      stats.errosPlanilha += 1;
      console.warn(
        `[link] linha ${lote.planilhaRowId} não encontrada para lote ${lote.id}`,
      );
      continue;
    }

    const observacaoCliente = observacaoPorLinha.get(lote.planilhaRowId) ?? '';
    const { assadeiraId } = await pedidoEmbalagemService.resolveAssadeiraDefault(
      lote.produtoId,
    );

    const key = loteToPedidoKey({
      dataPedido: lote.dataPedido,
      dataFabricacao: lote.dataFabricacao,
      tipoEstoqueId: lote.tipoEstoqueId,
      produtoId: lote.produtoId,
      observacaoCliente,
      assadeiraId,
    });

    const pedidoId = await pedidoEmbalagemService.resolvePedidoEmbalagemId(key);
    if (!pedidoId) {
      stats.aindaNull += 1;
      continue;
    }

    if (dryRun) {
      stats.vinculados += 1;
      continue;
    }

    try {
      await embalagemLoteRepository.updatePedidoEmbalagemId(lote.id, pedidoId);
      stats.vinculados += 1;
    } catch (error) {
      stats.errosUpdate += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[link] erro ao atualizar lote ${lote.id}: ${message}`);
    }
  }

  console.log('[link-embalagem-lotes-pedidos] concluído');
  console.log(`  candidatos: ${stats.candidatos}`);
  console.log(`  vinculados: ${stats.vinculados}`);
  console.log(`  ainda null: ${stats.aindaNull}`);
  console.log(`  sem planilha_row_id: ${stats.semPlanilhaRowId}`);
  console.log(`  erros planilha: ${stats.errosPlanilha}`);
  console.log(`  erros update: ${stats.errosUpdate}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
