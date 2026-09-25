/**
 * Carga de posições e alocações a partir de quadro.csv e colaboradores.csv.
 * Uso: npx tsx scripts/import-pessoas-etapa2.ts [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { CargaPessoasCsv } from '../src/domain/pessoas/carga-pessoas-csv';
import { QuadroContagem, QuadroMontagem, type VagaAprovada } from '../src/domain/pessoas/quadro-montagem';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function lerVagas(csv: string): VagaAprovada[] {
  const linhas = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  return linhas.slice(1).map((linha) => {
    const [setorCodigo, turnoCodigo, , quantidade] = linha.split(',');
    return {
      setorCodigo: setorCodigo.trim(),
      turnoCodigo: turnoCodigo.trim(),
      quantidade: Number(quantidade),
    };
  });
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const raiz = path.join(__dirname, '..', 'tmp', 'rh');
  const pessoas = new CargaPessoasCsv()
    .lerColaboradores(fs.readFileSync(path.join(raiz, 'colaboradores.csv'), 'utf8'))
    .map((p) => ({
      codigo: p.codigo,
      situacao: p.situacao,
      setorCodigo: p.setorCodigo,
      turnoCodigo: p.turnoCodigo,
      noQuadro: p.noQuadro,
    }));
  const vagas = lerVagas(fs.readFileSync(path.join(raiz, 'quadro.csv'), 'utf8'));
  const resultado = new QuadroMontagem().montar(vagas, pessoas);
  const numeros = new QuadroContagem().contar(resultado);
  console.log(
    `posicoes=${resultado.posicoes.length} alocacoes=${resultado.alocacoes.length} erros=${resultado.erros.length} aprovado=${numeros.aprovado} contratados=${numeros.contratados} reservas=${numeros.reservas} livres=${numeros.livres}`,
  );
  if (resultado.erros.length > 0) {
    for (const erro of resultado.erros) console.error(`${erro.codigo}: ${erro.motivo}`);
    process.exitCode = 1;
    return;
  }
  if (dryRun) return;

  const { supabaseClientFactory } = await import('../src/lib/clients/supabase-client-factory');
  const client = supabaseClientFactory.createServiceRoleClient();
  const ja = await client.from('pessoas_posicoes' as never).select('codigo');
  if (ja.error) throw ja.error;
  if ((ja.data ?? []).length > 0) {
    console.log('posicoes ja gravadas');
    return;
  }
  await new GravadorQuadro(client).gravar(resultado);
}

class GravadorQuadro {
  constructor(private readonly client: import('@supabase/supabase-js').SupabaseClient) {}

  async gravar(resultado: ReturnType<QuadroMontagem['montar']>): Promise<void> {
    const setores = await this.mapa('pessoas_setores');
    const turnos = await this.mapa('pessoas_turnos');
    const pessoas = await this.mapa('pessoas_colaboradores');
    const posicoes = await this.inserirPosicoes(resultado.posicoes, setores, turnos);
    await this.inserirAlocacoes(resultado.alocacoes, setores, turnos, pessoas, posicoes);
  }

  private async mapa(tabela: string): Promise<Map<string, string>> {
    const { data, error } = await this.client.from(tabela as never).select('id, codigo');
    if (error) throw error;
    const mapa = new Map<string, string>();
    for (const row of (data ?? []) as { id: string; codigo: string }[]) mapa.set(row.codigo, row.id);
    return mapa;
  }

  private async inserirPosicoes(
    posicoes: { codigo: string; setorCodigo: string; turnoCodigo: string }[],
    setores: Map<string, string>,
    turnos: Map<string, string>,
  ): Promise<Map<string, string>> {
    const rows = posicoes.map((p) => ({
      codigo: p.codigo,
      setor_id: setores.get(p.setorCodigo),
      turno_id: turnos.get(p.turnoCodigo),
      ativa: true,
    }));
    const { data, error } = await this.client.from('pessoas_posicoes' as never).insert(rows as never).select('id, codigo');
    if (error) throw error;
    const mapa = new Map<string, string>();
    for (const row of (data ?? []) as { id: string; codigo: string }[]) mapa.set(row.codigo, row.id);
    return mapa;
  }

  private async inserirAlocacoes(
    alocacoes: { pessoaCodigo: string; setorCodigo: string; turnoCodigo: string; papel: string; posicaoCodigo: string | null }[],
    setores: Map<string, string>,
    turnos: Map<string, string>,
    pessoas: Map<string, string>,
    posicoes: Map<string, string>,
  ): Promise<void> {
    const rows = alocacoes.map((a) => ({
      colaborador_id: pessoas.get(a.pessoaCodigo),
      setor_id: setores.get(a.setorCodigo),
      turno_id: turnos.get(a.turnoCodigo),
      posicao_id: a.posicaoCodigo ? posicoes.get(a.posicaoCodigo) : null,
      papel: a.papel,
    }));
    const { error } = await this.client.from('pessoas_alocacoes' as never).insert(rows as never);
    if (error) throw error;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
