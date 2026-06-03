/**
 * Importa lotes de embalagem da aba Pedido de embalagem para Supabase.
 *
 * Uso:
 *   npx tsx scripts/sync-embalagem-lotes-from-sheet.ts [--days=7] [--since=YYYY-MM-DD] [--dry-run] [--force]
 *
 * Não altera estoque_movimentos nem estoque_saldos.
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const { readSheetValues } = await import('../src/lib/googleSheets');
  const { PEDIDOS_EMBALAGEM_CONFIG } = await import('../src/config/embalagem');
  const { embalagemLoteRepository } = await import(
    '../src/data/embalagem/EmbalagemLoteRepository'
  );
  const { embalagemLoteService } = await import(
    '../src/lib/services/embalagem-lote-service'
  );
  const { mapRowToLoteInsert, rowTemProducao } = await import(
    '../src/domain/embalagem/map-sheet-row-to-lote'
  );
  const {
    parseSyncLoteArgs,
    resolveSinceDate,
    isDataPedidoInWindow,
  } = await import('../src/domain/embalagem/sync-lote-window');
  const { normalizeToISODate } = await import('../src/lib/utils/date-utils');

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const args = parseSyncLoteArgs(process.argv.slice(2));
  const since = resolveSinceDate(args);
  const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
  const rows = await readSheetValues(spreadsheetId, `${tabName}!A:AC`);
  const dataRows = rows.slice(1);

  const stats = {
    lidas: dataRows.length,
    elegiveis: 0,
    criadas: 0,
    atualizadas: 0,
    ignoradasJanela: 0,
    ignoradasSemProducao: 0,
    ignoradasDuplicata: 0,
    errosResolucao: 0,
  };
  const errosNomes: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const rowNumber = i + 2;
    const dataPedido = normalizeToISODate(r[0]);

    if (!isDataPedidoInWindow(dataPedido, { since })) {
      stats.ignoradasJanela += 1;
      continue;
    }

    if (!rowTemProducao(r)) {
      stats.ignoradasSemProducao += 1;
      continue;
    }

    stats.elegiveis += 1;

    const cliente = (r[2] || '').toString().trim();
    const produto = (r[4] || '').toString().trim();
    if (!cliente || !produto) {
      stats.errosResolucao += 1;
      errosNomes.push(`linha ${rowNumber}: cliente/produto vazio`);
      continue;
    }

    let tipoEstoqueId: string;
    let produtoId: string;
    try {
      ({ tipoEstoqueId, produtoId } = await embalagemLoteService.resolveIds(
        cliente,
        produto,
      ));
    } catch {
      stats.errosResolucao += 1;
      errosNomes.push(`linha ${rowNumber}: ${cliente} / ${produto}`);
      continue;
    }

    const payload = mapRowToLoteInsert(r, rowNumber, { tipoEstoqueId, produtoId });
    const existing = await embalagemLoteRepository.findByPlanilhaRowId(rowNumber);

    if (existing && !args.force) {
      stats.ignoradasDuplicata += 1;
      continue;
    }

    if (args.dryRun) {
      console.log('[dry-run]', rowNumber, cliente, produto, payload.quantidade);
      if (existing) stats.atualizadas += 1;
      else stats.criadas += 1;
      continue;
    }

    if (existing && args.force) {
      await embalagemLoteRepository.updateByPlanilhaRowId(rowNumber, payload);
      stats.atualizadas += 1;
    } else {
      await embalagemLoteRepository.insert(payload);
      stats.criadas += 1;
    }
  }

  console.log('Sync embalagem lotes concluído.', {
    since,
    dryRun: args.dryRun,
    force: args.force,
    ...stats,
  });

  if (errosNomes.length > 0) {
    console.warn('Erros de resolução (amostra):', errosNomes.slice(0, 20));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
