/**
 * Backfill batch de consumo de forno (brilho/confeito) por nome de insumo.
 *
 *   npx tsx scripts/backfill-forno-receita-por-insumo.ts --insumo="Fubá"
 *   npx tsx scripts/backfill-forno-receita-por-insumo.ts --insumo="Gema de Ovo Pasteurizada (top alto)"
 *   npx tsx scripts/backfill-forno-receita-por-insumo.ts --all-fuba-gema
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DEFAULTS = ['Fubá', 'Gema de Ovo Pasteurizada (top alto)'] as const;

function readInsumoNomes(): string[] {
  if (process.argv.includes('--all-fuba-gema')) return [...DEFAULTS];
  const flag = process.argv.find((arg) => arg.startsWith('--insumo='));
  if (!flag) return [...DEFAULTS];
  const nome = flag.slice('--insumo='.length).trim();
  return nome ? [nome] : [...DEFAULTS];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const nomes = readInsumoNomes();

  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { supabaseClientFactory } = await import(
    '../src/lib/clients/supabase-client-factory'
  );
  const { insumoConsumoFornoBackfillBatchService } = await import(
    '../src/lib/services/insumo-consumo-forno-backfill-batch-service'
  );
  const { insumoConsumoProdutividadeLoteRepository } = await import(
    '../src/data/insumos/InsumoConsumoProdutividadeLoteRepository'
  );

  const supabase = supabaseClientFactory.createServiceRoleClient();

  for (const nome of nomes) {
    const { data: insumo, error } = await supabase
      .from('insumos')
      .select('id, nome')
      .eq('nome', nome)
      .maybeSingle();
    if (error) throw error;
    if (!insumo?.id) {
      console.error(`[backfill-forno] insumo não encontrado: ${nome}`);
      continue;
    }

    const produtos = await insumoConsumoProdutividadeLoteRepository.listProdutosFornoPorInsumo(
      insumo.id as string,
    );
    const unicos = new Set(produtos.map((p) => p.produtoId));
    console.log(
      `[backfill-forno]${dryRun ? ' (dry-run)' : ''} ${nome} — ${unicos.size} produto(s)`,
    );

    if (dryRun) continue;

    const started = Date.now();
    const result = await insumoConsumoFornoBackfillBatchService.applyPorInsumo(
      insumo.id as string,
      null,
    );
    const elapsedSec = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `  ok: ${result.lotesProcessados} lote(s), ${result.movimentosInseridos} movimento(s), ${elapsedSec}s`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
