/**
 * Compara estoque da planilha (aba Estoque) com estoque_saldos no Supabase.
 * Exit 0 = sem divergências; exit 1 = há diferenças ou linhas não resolvidas.
 *
 * Uso:
 *   npm run reconcile-estoque
 *   npm run reconcile-estoque -- --json
 */
import path from 'node:path';
import dotenv from 'dotenv';
import type {
  EstoqueSnapshotEntry,
  UnresolvedSheetRow,
} from '../src/domain/estoque/estoque-reconcile';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const jsonOutput = process.argv.includes('--json');

async function main() {
  const { readSheetValues } = await import('../src/lib/googleSheets');
  const { INVENTARIO_SHEET_CONFIG, ESTOQUE_SHEET_COLUMNS } = await import(
    '../src/config/inventario'
  );
  const { tiposEstoqueService } = await import(
    '../src/lib/services/tipos-estoque-service'
  );
  const { SupabaseProductService } = await import(
    '../src/lib/services/products/supabase-product-service'
  );
  const { estoqueRepository } = await import('../src/data/estoque/EstoqueRepository');
  const {
    buildReconcileResult,
    buildSnapshotMap,
    formatReconcileReport,
    hasReconcileIssues,
  } = await import('../src/domain/estoque/estoque-reconcile');

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { spreadsheetId, tabName } = INVENTARIO_SHEET_CONFIG.destinoEstoque;
  const rows = await readSheetValues(spreadsheetId, `${tabName}!A:H`);
  const dataRows = rows.slice(1);

  const productService = new SupabaseProductService();
  const sheetEntries: EstoqueSnapshotEntry[] = [];
  const unresolved: UnresolvedSheetRow[] = [];

  for (const row of dataRows) {
    const tipoNome = (row[ESTOQUE_SHEET_COLUMNS.cliente] || '').toString().trim();
    const produtoNome = (row[ESTOQUE_SHEET_COLUMNS.produto] || '').toString().trim();
    if (!tipoNome || !produtoNome) continue;

    const tipo = await tiposEstoqueService.findByName(tipoNome);
    if (!tipo) {
      unresolved.push({
        tipoEstoque: tipoNome,
        produto: produtoNome,
        reason: 'tipo_estoque não encontrado no Supabase',
      });
      continue;
    }

    const produto = await productService.findByName(produtoNome);
    if (!produto) {
      unresolved.push({
        tipoEstoque: tipoNome,
        produto: produtoNome,
        reason: 'produto não encontrado no Supabase',
      });
      continue;
    }

    sheetEntries.push({
      tipoEstoque: tipo.nome,
      produto: produto.nome,
      quantidade: {
        caixas: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.caixas] || 0),
        pacotes: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.pacotes] || 0),
        unidades: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.unidades] || 0),
        kg: Number(row[ESTOQUE_SHEET_COLUMNS.quantidade.kg] || 0),
      },
    });
  }

  const sheetMap = buildSnapshotMap(sheetEntries);

  const dbSaldos = await estoqueRepository.listAllSaldos();
  const databaseEntries: EstoqueSnapshotEntry[] = dbSaldos.map((saldo) => ({
    tipoEstoque: saldo.tipoEstoqueNome,
    produto: saldo.produtoNome,
    quantidade: saldo.quantidade,
  }));
  const databaseMap = buildSnapshotMap(databaseEntries);

  const result = buildReconcileResult(sheetMap, databaseMap, unresolved);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReconcileReport(result));
  }

  if (hasReconcileIssues(result)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
