/**
 * Reconcilia consumo histórico de embalagem pela receita atual dos produtos
 * vinculados a um insumo (ex.: Embalagem plástica 560) — caminho batch.
 *
 *   npx tsx scripts/backfill-embalagem-receita-por-insumo.ts
 *   npx tsx scripts/backfill-embalagem-receita-por-insumo.ts --dry-run
 *   npx tsx scripts/backfill-embalagem-receita-por-insumo.ts --insumo="Embalagem plástica 560"
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DEFAULT_INSUMO = 'Embalagem plástica 560';

function readInsumoNome(): string {
  const flag = process.argv.find((arg) => arg.startsWith('--insumo='));
  if (!flag) return DEFAULT_INSUMO;
  return flag.slice('--insumo='.length).trim() || DEFAULT_INSUMO;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const insumoNome = readInsumoNome();

  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { supabaseClientFactory } = await import(
    '../src/lib/clients/supabase-client-factory'
  );
  const { insumoConsumoProdutividadeLoteRepository } = await import(
    '../src/data/insumos/InsumoConsumoProdutividadeLoteRepository'
  );
  const { insumoConsumoProdutividadeBackfillService } = await import(
    '../src/lib/services/insumo-consumo-produtividade-backfill-service'
  );
  const { insumoConsumoEmbalagemBackfillBatchService } = await import(
    '../src/lib/services/insumo-consumo-embalagem-backfill-batch-service'
  );
  const { InsumoConsumoProdutividadeFator } = await import(
    '../src/domain/insumos/insumo-consumo-produtividade-change'
  );

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data: insumo, error } = await supabase
    .from('insumos')
    .select('id, nome')
    .eq('nome', insumoNome)
    .maybeSingle();

  if (error) throw error;
  if (!insumo?.id) {
    throw new Error(`Insumo não encontrado: ${insumoNome}`);
  }

  const produtos =
    await insumoConsumoProdutividadeLoteRepository.listProdutosEmbalagemPorInsumo(
      insumo.id as string,
    );

  const changes = produtos.map((produto) => ({
    produtoId: produto.produtoId,
    produtoNome: produto.produtoNome,
    tipo: 'embalagem' as const,
    receitaId: produto.receitaId,
    quantidadeAntes: produto.quantidadePorProduto,
    quantidadeDepois: produto.quantidadePorProduto,
    forcarReconciliar: true,
  }));

  const validos = changes.filter(InsumoConsumoProdutividadeFator.deveBackfill);

  console.log(
    `[backfill-embalagem-receita]${dryRun ? ' (dry-run)' : ''} ${insumoNome}`,
  );
  console.log(`  produtos: ${validos.length}`);

  const preview = await insumoConsumoProdutividadeBackfillService.preview(validos, null);
  console.log(`  lotes: ${preview.lotesTotais}`);
  for (const item of preview.items) {
    console.log(`  - ${item.produtoNome}: ${item.lotesAfetados} lote(s)`);
  }

  if (dryRun) {
    console.log('[backfill-embalagem-receita] dry-run — nada gravado');
    return;
  }

  const started = Date.now();
  const result = await insumoConsumoEmbalagemBackfillBatchService.applyPorInsumoEmbalagem(
    insumo.id as string,
    null,
  );
  const elapsedSec = ((Date.now() - started) / 1000).toFixed(1);

  console.log('[backfill-embalagem-receita] concluído (batch)');
  console.log(`  produtos: ${result.produtos}`);
  console.log(`  lotes processados: ${result.lotesProcessados}`);
  console.log(`  movimentos inseridos: ${result.movimentosInseridos}`);
  console.log(`  tempo: ${elapsedSec}s`);
  if (result.avisos.length) {
    console.log(`  avisos: ${result.avisos.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
