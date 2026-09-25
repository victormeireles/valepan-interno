/**
 * Carga de faltas. Uso: npx tsx scripts/import-pessoas-faltas.ts [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { FaltaCargaCsv } from '../src/domain/pessoas/falta-carga-csv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const csv = fs.readFileSync(path.join(__dirname, '..', 'tmp', 'rh', 'faltas_jun_set_2026.csv'), 'utf8');
  const carga = new FaltaCargaCsv().ler(csv);
  const { supabaseClientFactory } = await import('../src/lib/clients/supabase-client-factory');
  const client = supabaseClientFactory.createServiceRoleClient();
  const pessoas = await client.from('pessoas_colaboradores' as never).select('id, codigo, setor_id, turno_id');
  if (pessoas.error) throw pessoas.error;
  const mapa = new Map(
    ((pessoas.data ?? []) as { id: string; codigo: string; setor_id: string | null; turno_id: string | null }[]).map(
      (row) => [row.codigo, row],
    ),
  );
  const semPessoa = carga.linhas.filter((linha) => !mapa.has(linha.colaboradorCodigo));
  const vistas = new Set<string>();
  const validas = carga.linhas.filter((linha) => {
    if (!mapa.has(linha.colaboradorCodigo)) return false;
    const chave = `${linha.colaboradorCodigo}|${linha.data}`;
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
  const duplicadas = carga.linhas.length - semPessoa.length - validas.length;
  console.log(`faltas=${validas.length} erros=${carga.erros.length + semPessoa.length + duplicadas}`);
  const rejeitados = [...new Set([...carga.erros, ...semPessoa.map((linha) => linha.colaboradorCodigo)])];
  for (const codigo of rejeitados) console.error(`${codigo}: sem colaborador ou tipo inválido`);
  if (carga.erros.length + semPessoa.length + duplicadas > 0) process.exitCode = 1;
  if (dryRun) return;
  const ja = await client.from('pessoas_faltas' as never).select('id', { count: 'exact', head: true });
  if (ja.error) throw ja.error;
  if ((ja.count ?? 0) > 0) {
    console.log('faltas ja gravadas');
    return;
  }
  const rows = validas.map((linha) => {
    const pessoa = mapa.get(linha.colaboradorCodigo)!;
    return {
      colaborador_id: pessoa.id,
      data: linha.data,
      classificacao: linha.classificacao,
      atestado: null,
      observacao: linha.observacao || null,
      setor_id: pessoa.setor_id,
      turno_id: pessoa.turno_id,
    };
  });
  const { error } = await client.from('pessoas_faltas' as never).insert(rows as never);
  if (error) throw error;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
