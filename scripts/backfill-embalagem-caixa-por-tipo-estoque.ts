/**
 * Reconcilia consumo histórico de embalagem só nos lotes de um tipo de estoque
 * (ex.: Damião), aplicando a exceção de receita de caixa.
 *
 *   npx tsx scripts/backfill-embalagem-caixa-por-tipo-estoque.ts --tipo="Damião"
 *   npx tsx scripts/backfill-embalagem-caixa-por-tipo-estoque.ts --tipo="Damião" --dry-run
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DEFAULT_TIPO = 'Damião';

function readFlag(name: string): string | null {
  const flag = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!flag) return null;
  return flag.slice(`--${name}=`.length).trim() || null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const tipoNome = readFlag('tipo') ?? DEFAULT_TIPO;

  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const { supabaseClientFactory } = await import(
    '../src/lib/clients/supabase-client-factory'
  );
  const { insumoConsumoEmbalagemBackfillBatchService } = await import(
    '../src/lib/services/insumo-consumo-embalagem-backfill-batch-service'
  );

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data: tipo, error: tipoError } = await supabase
    .from('tipos_estoque')
    .select('id, nome, receita_caixa_id')
    .eq('nome', tipoNome)
    .maybeSingle();

  if (tipoError) throw tipoError;
  if (!tipo?.id) {
    throw new Error(`Tipo de estoque não encontrado: ${tipoNome}`);
  }
  if (!tipo.receita_caixa_id) {
    throw new Error(
      `Tipo ${tipoNome} sem receita de caixa (exceção). Configure antes do backfill.`,
    );
  }

  const { data: lotes, error: lotesError } = await supabase
    .from('embalagem_lotes')
    .select('produto_id, produtos!inner ( id, nome )')
    .eq('tipo_estoque_id', tipo.id);

  if (lotesError) throw lotesError;

  const porProduto = new Map<string, { produtoId: string; produtoNome: string; lotes: number }>();
  for (const row of lotes ?? []) {
    const produto = row.produtos as { id: string; nome: string };
    const atual = porProduto.get(produto.id);
    if (atual) {
      atual.lotes += 1;
    } else {
      porProduto.set(produto.id, {
        produtoId: produto.id,
        produtoNome: produto.nome,
        lotes: 1,
      });
    }
  }

  const produtos = [...porProduto.values()].sort((a, b) =>
    a.produtoNome.localeCompare(b.produtoNome, 'pt-BR'),
  );
  const lotesTotais = produtos.reduce((acc, item) => acc + item.lotes, 0);

  console.log(
    `[backfill-embalagem-caixa]${dryRun ? ' (dry-run)' : ''} tipo=${tipoNome}`,
  );
  console.log(`  produtos: ${produtos.length}`);
  console.log(`  lotes: ${lotesTotais}`);
  for (const item of produtos) {
    console.log(`  - ${item.produtoNome}: ${item.lotes} lote(s)`);
  }

  if (dryRun) {
    console.log('[backfill-embalagem-caixa] dry-run — nada gravado');
    return;
  }

  const started = Date.now();
  const result = await insumoConsumoEmbalagemBackfillBatchService.applyPorProdutos(
    produtos.map((item) => ({
      produtoId: item.produtoId,
      produtoNome: item.produtoNome,
    })),
    null,
    tipo.id as string,
  );
  const elapsedSec = ((Date.now() - started) / 1000).toFixed(1);

  console.log('[backfill-embalagem-caixa] concluído');
  console.log(`  lotes processados: ${result.lotesProcessados}`);
  console.log(`  movimentos inseridos: ${result.movimentosInseridos}`);
  console.log(`  tempo: ${elapsedSec}s`);
  if (result.avisos.length) {
    console.log(`  avisos: ${result.avisos.length}`);
    for (const aviso of [...new Set(result.avisos)].slice(0, 10)) {
      console.log(`    - ${aviso}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
