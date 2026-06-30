/**
 * Backfill de enriquecimento Omie em pendências de insumo já existentes.
 *
 * Consulta ConsultarRecebimento na Omie (1 chamada por NF) e preenche
 * fornecedor, CFOP, NCM etc. sem recriar pendências nem entradas.
 *
 * Uso:
 *   npx tsx scripts/backfill-insumo-pendencias-enriquecimento-omie.ts [--dry-run] [--limit=N] [--empresa-id=UUID] [--force] [--incluir-ignorados] [--todos-status]
 *
 * npm:
 *   npm run backfill:insumo-pendencias-enriquecimento
 *   npm run backfill:insumo-pendencias-enriquecimento:dry
 */
import path from 'node:path';
import dotenv from 'dotenv';
import { parseArgValor } from '@/lib/scripts/parse-backfill-date-args';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function parseLimit(): number | undefined {
  const limitArg = parseArgValor('--limit');
  if (!limitArg) return undefined;
  const parsed = Number.parseInt(limitArg, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const forcar = process.argv.includes('--force');
  const incluirIgnorados = process.argv.includes('--incluir-ignorados');
  const todosStatus = process.argv.includes('--todos-status');
  const empresaId = parseArgValor('--empresa-id');
  const limitRecebimentos = parseLimit();

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { insumoPendenciaEnriquecimentoBackfillService } = await import(
    '../src/lib/services/insumo-pendencia-enriquecimento-backfill-service'
  );

  console.log(
    `[backfill-insumo-pendencias-enriquecimento-omie]${dryRun ? ' (dry-run)' : ''}${forcar ? ' force' : ''}${incluirIgnorados ? ' incluir-ignorados' : ''}${todosStatus ? ' todos-status' : ''}`,
  );
  if (empresaId) console.log(`  empresa-id: ${empresaId}`);
  if (limitRecebimentos) console.log(`  limit: ${limitRecebimentos}`);

  const result = await insumoPendenciaEnriquecimentoBackfillService.executar({
    dryRun,
    forcar,
    incluirIgnorados,
    todosStatus,
    empresaId,
    limitRecebimentos,
  });

  console.log('[backfill-insumo-pendencias-enriquecimento-omie] concluído');
  console.log(`  recebimentos consultados: ${result.recebimentosConsultados}`);
  console.log(`  pendências atualizadas: ${result.pendenciasAtualizadas}`);
  console.log(`  pendências sem item na NF: ${result.pendenciasSemItem}`);
  console.log(`  erros: ${result.erros}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
