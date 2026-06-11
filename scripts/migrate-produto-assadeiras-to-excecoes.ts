/**
 * Relatório: compara vínculos manuais em produto_assadeiras com o que a regra resolveria.
 *
 * Uso:
 *   npx tsx scripts/migrate-produto-assadeiras-to-excecoes.ts [--dry-run]
 *
 * --dry-run é o padrão (somente log). Passe --apply para futuras ações destrutivas (não implementado).
 */
import path from 'node:path';
import dotenv from 'dotenv';
import { assadeiraResolver } from '../src/domain/assadeiras/assadeira-resolver';
import { supabaseClientFactory } from '../src/lib/clients/supabase-client-factory';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

type ManualLink = {
  produto_id: string;
  assadeira_id: string;
  produto_nome: string;
};

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: links, error } = await supabase
    .from('produto_assadeiras')
    .select('produto_id, assadeira_id, produtos(nome)');

  if (error) {
    console.error('Erro ao carregar produto_assadeiras:', error.message);
    process.exit(1);
  }

  const byProduto = new Map<string, ManualLink[]>();
  for (const row of links ?? []) {
    const produto = Array.isArray(row.produtos) ? row.produtos[0] : row.produtos;
    const entry: ManualLink = {
      produto_id: row.produto_id,
      assadeira_id: row.assadeira_id,
      produto_nome: produto?.nome ?? row.produto_id,
    };
    const list = byProduto.get(row.produto_id) ?? [];
    list.push(entry);
    byProduto.set(row.produto_id, list);
  }

  console.log(`Modo: ${dryRun ? 'dry-run (relatório)' : 'apply'}`);
  console.log(`Produtos com vínculos manuais: ${byProduto.size}\n`);

  let matchCount = 0;
  let mismatchCount = 0;

  for (const [produtoId, manualLinks] of byProduto) {
    const manualIds = new Set(manualLinks.map((l) => l.assadeira_id));
    const regraVinculos = await assadeiraResolver.resolveForProduto(produtoId);
    const regraIds = new Set(regraVinculos.map((v) => v.assadeira_id));
    const match = setsEqual(manualIds, regraIds);
    const nome = manualLinks[0]?.produto_nome ?? produtoId;

    if (match) {
      matchCount += 1;
      console.log(`[MATCH] ${nome}`);
      console.log(`  manual: ${[...manualIds].join(', ') || '—'}`);
      console.log(`  regra:  ${[...regraIds].join(', ') || '—'}`);
    } else {
      mismatchCount += 1;
      console.log(`[DIFF]  ${nome}`);
      console.log(`  manual: ${[...manualIds].join(', ') || '—'}`);
      console.log(`  regra:  ${[...regraIds].join(', ') || '—'}`);
    }
    console.log('');
  }

  console.log('---');
  console.log(`Match: ${matchCount} | Diferente: ${mismatchCount}`);
  console.log(
    'Vínculos manuais idênticos à regra podem ser candidatos a remoção (exceção desnecessária).',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
