import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const { categoriaVisibilidadeManager } = await import(
    '../src/domain/categorias/categoria-visibilidade-manager'
  );

  if (dryRun) {
    const categorias = await categoriaVisibilidadeManager.listCategoriasAtivasComVisibilidade();
    const visiveis = categorias.filter((c) => c.visivel_embalagem);
    console.log('[dry-run] Categorias visíveis na embalagem:');
    for (const categoria of visiveis) {
      console.log(`  - ${categoria.nome}`);
    }
    return;
  }

  const atualizadas = await categoriaVisibilidadeManager.seedCategoriasSempreVisiveisEmbalagem();
  if (atualizadas.length === 0) {
    console.log('Hambúrguer e Hot Dog já estavam marcados como visíveis (ou coluna ainda não existe).');
    return;
  }

  console.log('Marcadas como visíveis na embalagem:');
  for (const nome of atualizadas) {
    console.log(`  - ${nome}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
