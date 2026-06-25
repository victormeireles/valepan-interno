/**
 * Backfill do número da NF nos movimentos de insumo (entrada_nf).
 *
 * Reconsulta a Omie (ConsultarRecebimento por nIdReceb) para preencher
 * `insumo_movimentos.numero_nf` nas entradas NF antigas que não têm o dado.
 *
 * Pré-requisito: a migration ALTER_INSUMO_MOVIMENTOS_NUMERO_NF.sql já aplicada.
 * (As resoluções de pendência já são preenchidas pelo backfill SQL da migration.)
 *
 * Uso:
 *   npx tsx scripts/backfill-insumo-movimentos-numero-nf.ts [--dry-run]
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

  const { insumoMovimentoNfBackfillService } = await import(
    '../src/lib/services/insumo-movimento-nf-backfill-service'
  );

  console.log(
    `[backfill-insumo-movimentos-numero-nf]${dryRun ? ' (dry-run)' : ''} iniciando…`,
  );

  const resultado = await insumoMovimentoNfBackfillService.backfill({ dryRun });

  console.log('[backfill-insumo-movimentos-numero-nf] concluído');
  console.log(`  recebimentos consultados: ${resultado.recebimentosConsultados}`);
  console.log(`  movimentos atualizados${dryRun ? ' (simulado)' : ''}: ${resultado.movimentosAtualizados}`);
  console.log(`  recebimentos sem número de NF: ${resultado.semNumero}`);
  console.log(`  movimentos sem credencial de empresa: ${resultado.semCredencial}`);
  console.log(`  erros: ${resultado.erros}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
