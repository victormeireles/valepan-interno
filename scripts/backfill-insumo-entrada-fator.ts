/**
 * Corrige entradas de insumos em que o preço da NF (saco/embalagem) foi gravado
 * como custo unitário do insumo sem aplicar o fator de conversão.
 *
 *   npx tsx scripts/backfill-insumo-entrada-fator.ts [--dry-run]
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { insumoEntradaFatorBackfillService } = await import(
    '../src/lib/services/insumo-entrada-fator-backfill-service'
  );

  console.log(
    `[backfill-insumo-entrada-fator]${dryRun ? ' (dry-run)' : ''} iniciando...`,
  );

  const result = await insumoEntradaFatorBackfillService.executar(dryRun);

  console.log('[backfill-insumo-entrada-fator] concluído');
  console.log(`  insumos corrigidos: ${result.insumosCorrigidos}`);
  console.log(`  movimentos corrigidos: ${result.movimentosCorrigidos}`);

  for (const detalhe of result.detalhes) {
    console.log(
      `  - ${detalhe.insumoNome}: ${detalhe.movimentosCorrigidos} mov(s) | saldo ${detalhe.saldoAnterior} → ${detalhe.saldoNovo} | custo ${detalhe.custoAnterior} → ${detalhe.custoNovo}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
