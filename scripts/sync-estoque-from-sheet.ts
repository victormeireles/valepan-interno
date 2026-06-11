/**
 * Importa saldos da aba Estoque (planilha) para Supabase.
 * Uso: npx tsx scripts/sync-estoque-from-sheet.ts [--dry-run]
 *
 * dotenv deve rodar antes de importar módulos que instanciam Supabase (imports ESM são hoisted).
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const { readSheetValues } = await import('../src/lib/googleSheets');
  const { ESTOQUE_SHEET_CONFIG, ESTOQUE_SHEET_COLUMNS } = await import(
    '../src/config/estoque-sheet'
  );
  const { tiposEstoqueService } = await import(
    '../src/lib/services/tipos-estoque-service'
  );
  const { SupabaseProductService } = await import(
    '../src/lib/services/products/supabase-product-service'
  );
  const { estoqueRepository } = await import('../src/data/estoque/EstoqueRepository');

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { spreadsheetId, tabName } = ESTOQUE_SHEET_CONFIG;
  const rows = await readSheetValues(spreadsheetId, `${tabName}!A:H`);
  const dataRows = rows.slice(1);

  const productService = new SupabaseProductService();
  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const tipoNome = (row[ESTOQUE_SHEET_COLUMNS.cliente] || '').toString().trim();
    const produtoNome = (row[ESTOQUE_SHEET_COLUMNS.produto] || '').toString().trim();
    if (!tipoNome || !produtoNome) continue;

    const tipo = await tiposEstoqueService.findByName(tipoNome);
    const produto = await productService.findByName(produtoNome);

    if (!tipo || !produto) {
      console.warn('[skip]', { tipoNome, produtoNome, tipo: !!tipo, produto: !!produto });
      skipped += 1;
      continue;
    }

    const quantidade = {
      caixas: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.caixas] || 0),
      pacotes: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.pacotes] || 0),
      unidades: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.unidades] || 0),
      kg: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.kg] || 0),
    };

    if (dryRun) {
      console.log('[dry-run]', tipoNome, produtoNome, quantidade);
      imported += 1;
      continue;
    }

    await estoqueRepository.upsertSaldo(tipo.id, produto.id, quantidade);
    await estoqueRepository.insertMovimento({
      tipoEstoqueId: tipo.id,
      produtoId: produto.id,
      delta: quantidade,
      saldo: quantidade,
      origem: 'ajuste_manual',
    });
    imported += 1;
  }

  console.log(`Concluído. Importados: ${imported}, ignorados: ${skipped}, dryRun: ${dryRun}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
