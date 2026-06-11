// scripts/migrate-tipos-estoque-etiqueta-flags.ts
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SERVICE_ROLE;
  if (!url || !key) {
    throw new Error('SUPABASE_URL e SERVICE_ROLE devem estar no .env.local');
  }

  const supabase = createClient(url, key);

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('nome_fantasia, tem_validade_congelado_na_etiqueta, tem_texto_indicando_congelado_na_etiqueta');

  if (error) throw error;

  const { data: tipos } = await supabase.from('tipos_estoque').select('id, nome, congelado, mostrar_texto_congelado');
  if (!tipos) throw new Error('No tipos_estoque');

  let updated = 0;
  for (const tipo of tipos) {
    const cliente = (clientes ?? []).find(
      (c) => c.nome_fantasia?.trim().toLowerCase() === tipo.nome.trim().toLowerCase(),
    );
    if (!cliente) continue;

    const patch: Record<string, boolean> = {};
    if (cliente.tem_texto_indicando_congelado_na_etiqueta) {
      patch.mostrar_texto_congelado = true;
    }
    if (cliente.tem_validade_congelado_na_etiqueta && !tipo.congelado) {
      patch.congelado = true;
    }
    if (Object.keys(patch).length === 0) continue;

    console.log(`${dryRun ? '[dry-run] ' : ''}Update ${tipo.nome}:`, patch);
    if (!dryRun) {
      const { error: upErr } = await supabase.from('tipos_estoque').update(patch).eq('id', tipo.id);
      if (upErr) throw upErr;
    }
    updated += 1;
  }

  // HB Brioche hardcode → produtos.nome_etiqueta
  const nomeEtiqueta = 'HB Smash Brioche 50g 10cm';
  const { data: produto } = await supabase
    .from('produtos')
    .select('id, nome, nome_etiqueta')
    .ilike('nome', 'HB Brioche 50g 10cm')
    .maybeSingle();

  if (produto && !produto.nome_etiqueta) {
    console.log(`${dryRun ? '[dry-run] ' : ''}Set nome_etiqueta for ${produto.nome}`);
    if (!dryRun) {
      await supabase.from('produtos').update({ nome_etiqueta: nomeEtiqueta }).eq('id', produto.id);
    }
  }

  console.log(`Done. tipos updated: ${updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
