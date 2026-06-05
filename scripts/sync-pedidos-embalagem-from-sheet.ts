/**
 * Sincroniza pedidos de embalagem (meta A–J) da planilha para Supabase.
 *
 * Janela default: data_producao (coluna A) de hoje −3 até hoje +3 (fuso BR).
 *
 * Uso:
 *   npx tsx scripts/sync-pedidos-embalagem-from-sheet.ts [--dry-run] [--from=YYYY-MM-DD] [--until=YYYY-MM-DD]
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const { parseSyncPedidoArgs, resolvePedidoSyncWindow } = await import(
    '../src/domain/embalagem/sync-pedido-window'
  );
  const { pedidoEmbalagemService } = await import(
    '../src/lib/services/pedido-embalagem-service'
  );

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const args = parseSyncPedidoArgs(process.argv.slice(2));
  const window = resolvePedidoSyncWindow(args);

  console.log(
    `[sync-pedidos-embalagem] janela ${window.from} .. ${window.to}${args.dryRun ? ' (dry-run)' : ''}`,
  );

  const result = await pedidoEmbalagemService.reconcileWindow(window, {
    dryRun: args.dryRun,
  });

  console.log('[sync-pedidos-embalagem] concluído');
  console.log(`  dias processados: ${result.days}`);
  console.log(`  grupos upsert: ${result.totalUpserted}`);
  console.log(`  registros removidos: ${result.totalDeleted}`);

  if (result.resolveErrors.length > 0) {
    console.log(`  erros de resolução (${result.resolveErrors.length}):`);
    for (const err of result.resolveErrors.slice(0, 20)) {
      console.log(`    - ${err}`);
    }
    if (result.resolveErrors.length > 20) {
      console.log(`    ... e mais ${result.resolveErrors.length - 20}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
