/**
 * Reprocessa eventos Omie pendentes de RecebimentoProduto.Concluido.
 *
 * Uso:
 *   npx tsx scripts/backfill-insumo-recebimentos-omie.ts [--dry-run] [--limit=N]
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function parseLimit(): number {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  if (!limitArg) return 20;
  const parsed = Number.parseInt(limitArg.split('=')[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const batchLimit = parseLimit();

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { omieWebhookEventoRepository } = await import(
    '../src/data/omie/OmieWebhookEventoRepository'
  );
  const { insumoRecebimentoProcessor } = await import(
    '../src/lib/services/insumo-recebimento-processor'
  );

  console.log(
    `[backfill-insumo-recebimentos-omie]${dryRun ? ' (dry-run)' : ''} batchLimit=${batchLimit}`,
  );

  if (dryRun) {
    const eventos = await omieWebhookEventoRepository.listPendentesRecebimento(batchLimit);
    console.log(`  ${eventos.length} evento(s) pendente(s):`);
    for (const evento of eventos) {
      console.log(`    - ${evento.id} | ${evento.topic} | ${evento.received_at}`);
    }
    return;
  }

  let totalProcessados = 0;
  let totalErros = 0;
  let batches = 0;

  while (batches < 500) {
    const result = await insumoRecebimentoProcessor.processarPendentes(batchLimit);
    totalProcessados += result.processados;
    totalErros += result.erros;
    batches += 1;

    if (result.processados === 0 && result.erros === 0) {
      break;
    }
  }

  console.log('[backfill-insumo-recebimentos-omie] concluído');
  console.log(`  processados: ${totalProcessados}`);
  console.log(`  erros: ${totalErros}`);
  console.log(`  batches: ${batches}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
