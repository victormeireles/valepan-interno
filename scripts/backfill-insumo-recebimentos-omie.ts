/**
 * Backfill de entradas de insumos via Omie.
 *
 * Modo 1 — eventos webhook pendentes no banco:
 *   npx tsx scripts/backfill-insumo-recebimentos-omie.ts [--dry-run] [--limit=N]
 *
 * Modo 2 — buscar recebimentos concluídos na API Omie por período:
 *   npx tsx scripts/backfill-insumo-recebimentos-omie.ts --de=01/05/2026 [--ate=23/06/2026] [--por=emissao] [--empresa-id=UUID] [--dry-run]
 *   Padrão: --por=recebimento (data em que o recebimento foi concluído no Omie, dtAlt)
 */
import path from 'node:path';
import dotenv from 'dotenv';
import {
  formatarDataBr,
  parseArgValor,
  parseDataBr,
} from '@/lib/scripts/parse-backfill-date-args';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function parseLimit(): number {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  if (!limitArg) return 20;
  const parsed = Number.parseInt(limitArg.split('=')[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

async function processarEventosPendentes(dryRun: boolean, batchLimit: number): Promise<void> {
  const { omieWebhookEventoRepository } = await import(
    '../src/data/omie/OmieWebhookEventoRepository'
  );
  const { insumoRecebimentoProcessor } = await import(
    '../src/lib/services/insumo-recebimento-processor'
  );

  console.log(
    `[backfill-insumo-recebimentos-omie] modo=eventos-pendentes${dryRun ? ' (dry-run)' : ''} batchLimit=${batchLimit}`,
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

async function processarPeriodoOmie(dryRun: boolean): Promise<void> {
  const dataDe = parseDataBr(parseArgValor('--de') ?? '', '--de');
  const dataAte = parseDataBr(parseArgValor('--ate') ?? formatarDataBr(new Date()), '--ate');
  const empresaId = parseArgValor('--empresa-id');
  const reprocessar = process.argv.includes('--reprocessar');
  const porArg = parseArgValor('--por');
  const criterioData = porArg === 'emissao' ? 'emissao' : 'recebimento';

  const { insumoRecebimentoBackfillService } = await import(
    '../src/lib/services/insumo-recebimento-backfill-service'
  );

  console.log(
    `[backfill-insumo-recebimentos-omie] modo=periodo-omie${dryRun ? ' (dry-run)' : ''} por=${criterioData} de=${dataDe} ate=${dataAte}`,
  );

  const result = await insumoRecebimentoBackfillService.backfillPorPeriodo({
    dataDe,
    dataAte,
    criterioData,
    empresaId,
    dryRun,
    reprocessar,
  });

  console.log('[backfill-insumo-recebimentos-omie] concluído');
  console.log(`  empresas: ${result.empresas}`);
  console.log(`  listados (etapa concluída): ${result.listados}`);
  console.log(`  já processados: ${result.jaProcessados}`);
  console.log(`  processados agora: ${result.processados}`);
  console.log(`  erros: ${result.erros}`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const dataDe = parseArgValor('--de');

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  if (dataDe) {
    await processarPeriodoOmie(dryRun);
    return;
  }

  await processarEventosPendentes(dryRun, parseLimit());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
