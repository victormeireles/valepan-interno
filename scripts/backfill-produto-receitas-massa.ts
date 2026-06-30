/**
 * Recalcula quantidade_por_produto de todos os vínculos produto × receita de massa.
 *
 * Regra: peso total da receita (kg + L + g) ÷ gramatura do pão.
 *
 * Uso:
 *   npx tsx scripts/backfill-produto-receitas-massa.ts [--dry-run]
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function formatNum(value: number): string {
  return value.toLocaleString('pt-BR');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { receitaMassaVinculosSyncManager } = await import(
    '../src/domain/receitas/receita-massa-vinculos-sync-manager'
  );

  console.log(dryRun ? 'Modo dry-run (nenhuma alteração será gravada)\n' : 'Aplicando alterações...\n');

  const resultado = await receitaMassaVinculosSyncManager.backfillAllMassa({ dryRun });

  console.log('Resumo:');
  console.log(`  receitas de massa processadas: ${resultado.receitasProcessadas}`);
  console.log(`  vínculos atualizados: ${resultado.atualizados}`);
  console.log(`  vínculos já corretos: ${resultado.inalterados}`);
  console.log(`  vínculos ignorados: ${resultado.ignorados.length}`);

  if (resultado.mudancas.length > 0) {
    console.log(`\nAlterações${dryRun ? ' previstas' : ''} (${resultado.mudancas.length}):`);
    for (const item of resultado.mudancas.slice(0, 50)) {
      console.log(
        `  - ${item.receitaNome} → ${item.produtoNome}: ${formatNum(item.quantidadeAtual)} → ${formatNum(item.quantidadeNova)} pães/receita`,
      );
    }
    if (resultado.mudancas.length > 50) {
      console.log(`  ... e mais ${resultado.mudancas.length - 50}`);
    }
  }

  if (resultado.ignorados.length > 0) {
    console.log(`\nIgnorados (${resultado.ignorados.length}):`);
    for (const item of resultado.ignorados.slice(0, 30)) {
      console.log(`  - ${item.receitaNome} → ${item.produtoNome}: ${item.motivo}`);
    }
    if (resultado.ignorados.length > 30) {
      console.log(`  ... e mais ${resultado.ignorados.length - 30}`);
    }
  }

  if (dryRun && resultado.atualizados > 0) {
    console.log('\nExecute sem --dry-run para gravar as alterações.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
