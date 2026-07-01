/**
 * Cadastra pares gramatura assada → massa crua (g) nas receitas de massa ativas.
 *
 * Uso:
 *   npx tsx scripts/seed-receita-massa-crua.ts [--dry-run]
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

type ParMassaCrua = { assadaG: number; cruaG: number };

/** Chave = nome exato da receita no banco. */
const PARES_POR_RECEITA: Record<string, ParMassaCrua[]> = {
  'HB Australiano': [
    { assadaG: 20, cruaG: 25 },
    { assadaG: 30, cruaG: 40 },
    { assadaG: 50, cruaG: 60 },
    { assadaG: 60, cruaG: 70 },
    { assadaG: 65, cruaG: 74 },
    { assadaG: 75, cruaG: 80 },
  ],
  'HB Brioche': [
    { assadaG: 20, cruaG: 25 },
    { assadaG: 30, cruaG: 40 },
    { assadaG: 50, cruaG: 60 },
    { assadaG: 60, cruaG: 70 },
    { assadaG: 65, cruaG: 74 },
    { assadaG: 70, cruaG: 76 },
    { assadaG: 75, cruaG: 80 },
  ],
  'HB MB': [
    { assadaG: 20, cruaG: 25 },
    { assadaG: 30, cruaG: 40 },
    { assadaG: 50, cruaG: 60 },
    { assadaG: 60, cruaG: 70 },
    { assadaG: 65, cruaG: 74 },
    { assadaG: 75, cruaG: 80 },
  ],
  'HB Brioche Schimidt': [
    { assadaG: 50, cruaG: 60 },
    { assadaG: 60, cruaG: 70 },
    { assadaG: 70, cruaG: 80 },
  ],
  'Hot Casa / Careca Escola': [
    { assadaG: 30, cruaG: 36 },
    { assadaG: 50, cruaG: 56 },
    { assadaG: 65, cruaG: 74 },
    { assadaG: 70, cruaG: 76 },
    { assadaG: 100, cruaG: 110 },
  ],
  'HB Podrão': [{ assadaG: 80, cruaG: 90 }],
  Panetone: [{ assadaG: 400, cruaG: 450 }],
  Milani: [
    { assadaG: 50, cruaG: 60 },
    { assadaG: 60, cruaG: 70 },
  ],
  'Pão de Forma': [{ assadaG: 500, cruaG: 550 }],
  'Pão Francês': [{ assadaG: 50, cruaG: 58 }],
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { supabaseClientFactory } = await import('../src/lib/clients/supabase-client-factory');
  const { receitaMassaVinculosSyncManager } = await import(
    '../src/domain/receitas/receita-massa-vinculos-sync-manager'
  );

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const nomes = Object.keys(PARES_POR_RECEITA);

  const { data: receitas, error: receitasError } = await supabase
    .from('receitas')
    .select('id, nome, ativo')
    .eq('tipo', 'massa')
    .in('nome', nomes);

  if (receitasError) throw receitasError;

  const receitaPorNome = new Map((receitas ?? []).map((r) => [r.nome, r]));
  const faltando = nomes.filter((nome) => !receitaPorNome.has(nome));

  if (faltando.length > 0) {
    console.warn('Receitas não encontradas no banco:', faltando.join(', '));
  }

  let paresInseridos = 0;

  for (const [nome, pares] of Object.entries(PARES_POR_RECEITA)) {
    const receita = receitaPorNome.get(nome);
    if (!receita) continue;

    console.log(`\n${nome} (${receita.ativo ? 'ativa' : 'inativa'})`);
    for (const par of pares) {
      console.log(`  ${par.assadaG} g assado → ${par.cruaG} g massa crua`);
    }

    if (dryRun) continue;

    const { error: deleteError } = await supabase
      .from('receita_gramaturas')
      .delete()
      .eq('receita_id', receita.id);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from('receita_gramaturas').insert(
      pares.map((par) => ({
        receita_id: receita.id,
        peso_g: par.assadaG,
        quantidade_padrao: par.cruaG,
      })),
    );

    if (insertError) throw insertError;
    paresInseridos += pares.length;
  }

  if (dryRun) {
    console.log('\nModo dry-run: nenhuma alteração gravada.');
    return;
  }

  console.log(`\n${paresInseridos} pares gravados. Recalculando vínculos de massa...\n`);

  const resultado = await receitaMassaVinculosSyncManager.backfillAllMassa({ dryRun: false });

  console.log('Resumo do recálculo:');
  console.log(`  receitas processadas: ${resultado.receitasProcessadas}`);
  console.log(`  vínculos atualizados: ${resultado.atualizados}`);
  console.log(`  vínculos já corretos: ${resultado.inalterados}`);
  console.log(`  vínculos ignorados: ${resultado.ignorados.length}`);

  if (resultado.mudancas.length > 0) {
    console.log(`\nAlterações (${resultado.mudancas.length}):`);
    for (const item of resultado.mudancas.slice(0, 40)) {
      console.log(
        `  - ${item.receitaNome} → ${item.produtoNome}: ${item.quantidadeAtual} → ${item.quantidadeNova} pães/receita`,
      );
    }
    if (resultado.mudancas.length > 40) {
      console.log(`  ... e mais ${resultado.mudancas.length - 40}`);
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
