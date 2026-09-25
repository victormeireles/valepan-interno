/**
 * Carga privada de setores, horários e colaboradores (etapa 1).
 *
 * Uso:
 *   npx tsx scripts/import-pessoas-etapa1.ts --dry-run [setores.csv] [colaboradores.csv] [HORARIOS.md]
 *
 * Sem --dry-run: upsert por codigo. Não remove quem não está no CSV.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CargaPessoasCsv, type CargaColaboradorLinha } from '../src/domain/pessoas/carga-pessoas-csv';
import { CargaPessoasPreview } from '../src/domain/pessoas/carga-pessoas-preview';
import type { CargaSetor, CargaTurno } from '../src/domain/pessoas/carga-pessoas-tipos';
import { HorarioDiaParser, type HorarioCelula } from '../src/domain/pessoas/horario-dia';
import { NomeCapitalizador } from '../src/domain/pessoas/nome-capitalizador';

type CargaTurnoDia = HorarioCelula & { turnoCodigo: string; dia: number };

type PathsCarga = {
  setores: string;
  colaboradores: string;
  horarios: string;
  dryRun: boolean;
};

class ImportPessoasArgs {
  parse(argv: string[]): PathsCarga {
    const dryRun = argv.includes('--dry-run');
    const pos = argv.filter((a) => a !== '--dry-run' && !a.endsWith('.ts'));
    const raiz = path.join(__dirname, '..');
    const padrao = (rel: string) => path.join(raiz, 'tmp', 'rh', rel);
    return {
      dryRun,
      setores: pos[0] ?? padrao('setores.csv'),
      colaboradores: pos[1] ?? padrao('colaboradores.csv'),
      horarios: pos[2] ?? padrao('HORARIOS.md'),
    };
  }
}

class HorariosMdLeitor {
  private readonly parser = new HorarioDiaParser();
  private readonly nomes = new NomeCapitalizador();

  ler(md: string, setores: CargaSetor[]): { turnos: CargaTurno[]; dias: CargaTurnoDia[] } {
    const porNome = this.indiceSetores(setores);
    const turnos: CargaTurno[] = [];
    const dias: CargaTurnoDia[] = [];
    for (const linha of md.split(/\r?\n/)) {
      if (!linha.startsWith('|') || linha.includes('---') || linha.includes('Setor')) continue;
      const lido = this.lerLinha(linha, porNome);
      if (!lido) continue;
      turnos.push(lido.turno);
      dias.push(...lido.dias);
    }
    return { turnos, dias };
  }

  private indiceSetores(setores: CargaSetor[]): Map<string, CargaSetor> {
    const mapa = new Map<string, CargaSetor>();
    for (const s of setores) mapa.set(this.chave(s.nome), s);
    return mapa;
  }

  private chave(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  private lerLinha(
    linha: string,
    porNome: Map<string, CargaSetor>,
  ): { turno: CargaTurno; dias: CargaTurnoDia[] } | null {
    const cells = linha
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 8) return null;
    const codeMatch = cells[1].match(/`([^`]+)`/);
    if (!codeMatch) return null;
    const setor = porNome.get(this.chave(cells[0]));
    if (!setor) return null;
    const nomeTurno = cells[1].replace(/`[^`]+`/g, '').replace(/[()]/g, '').trim();
    const turno: CargaTurno = {
      codigo: codeMatch[1],
      setorCodigo: setor.codigo,
      nome: this.nomes.formatar(nomeTurno),
      operacional: setor.tipo === 'operacional',
    };
    const dias = cells.slice(2, 8).map((celula, i) => ({
      turnoCodigo: turno.codigo,
      dia: i + 1,
      ...this.parser.parseCelula(celula),
    }));
    return { turno, dias };
  }
}

class ImportPessoasEnv {
  carregar(): void {
    const candidatos = [
      path.join(__dirname, '..', '.env.local'),
      path.join(__dirname, '..', '..', '..', '.env.local'),
    ];
    for (const arquivo of candidatos) {
      if (fs.existsSync(arquivo)) dotenv.config({ path: arquivo });
    }
  }
}

class ImportPessoasCodigosGravados {
  async listar(client: SupabaseClient): Promise<string[]> {
    const tabelas = ['pessoas_setores', 'pessoas_turnos', 'pessoas_colaboradores'] as const;
    const codigos: string[] = [];
    for (const tabela of tabelas) {
      const { data, error } = await client.from(tabela as never).select('codigo');
      if (error) throw error;
      for (const row of data ?? []) {
        const codigo = (row as { codigo?: string }).codigo;
        if (codigo) codigos.push(codigo);
      }
    }
    return codigos;
  }
}

class ImportPessoasUpsert {
  constructor(private readonly client: SupabaseClient) {}

  async gravar(
    setores: CargaSetor[],
    turnos: CargaTurno[],
    dias: CargaTurnoDia[],
    colaboradores: CargaColaboradorLinha[],
    ok: Set<string>,
  ): Promise<void> {
    const setorIds = await this.upsertSetores(setores.filter((s) => ok.has(s.codigo)));
    const turnoIds = await this.upsertTurnos(
      turnos.filter((t) => ok.has(t.codigo)),
      setorIds,
    );
    await this.upsertDias(dias.filter((d) => ok.has(d.turnoCodigo)), turnoIds);
    await this.upsertColaboradores(
      colaboradores.filter((c) => ok.has(c.codigo)),
      setorIds,
      turnoIds,
    );
  }

  private async upsertSetores(setores: CargaSetor[]): Promise<Map<string, string>> {
    const rows = setores.map((s) => ({
      codigo: s.codigo,
      nome: s.nome,
      tipo: s.tipo,
      agrupamento_proposto: s.agrupamentoProposto,
      ativo: true,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return new Map();
    const { data, error } = await this.client
      .from('pessoas_setores' as never)
      .upsert(rows as never, { onConflict: 'codigo' })
      .select('id, codigo');
    if (error) throw error;
    return this.mapaIds(data);
  }

  private async upsertTurnos(
    turnos: CargaTurno[],
    setorIds: Map<string, string>,
  ): Promise<Map<string, string>> {
    const rows = turnos.map((t) => ({
      codigo: t.codigo,
      setor_id: setorIds.get(t.setorCodigo)!,
      nome: t.nome,
      operacional: t.operacional,
      ativo: true,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return new Map();
    const { data, error } = await this.client
      .from('pessoas_turnos' as never)
      .upsert(rows as never, { onConflict: 'codigo' })
      .select('id, codigo');
    if (error) throw error;
    return this.mapaIds(data);
  }

  private async upsertDias(dias: CargaTurnoDia[], turnoIds: Map<string, string>): Promise<void> {
    const rows = dias.map((d) => ({
      turno_id: turnoIds.get(d.turnoCodigo)!,
      dia: d.dia,
      inicio: d.inicio,
      fim: d.fim,
      termina_dia_seguinte: d.terminaDiaSeguinte,
      situacao: d.situacao,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return;
    const { error } = await this.client
      .from('pessoas_turno_dias' as never)
      .upsert(rows as never, { onConflict: 'turno_id,dia' });
    if (error) throw error;
  }

  private async upsertColaboradores(
    colaboradores: CargaColaboradorLinha[],
    setorIds: Map<string, string>,
    turnoIds: Map<string, string>,
  ): Promise<void> {
    const rows = colaboradores.map((c) => this.rowColaborador(c, setorIds, turnoIds));
    if (rows.length === 0) return;
    const { error } = await this.client
      .from('pessoas_colaboradores' as never)
      .upsert(rows as never, { onConflict: 'codigo' });
    if (error) throw error;
  }

  private rowColaborador(
    c: CargaColaboradorLinha,
    setorIds: Map<string, string>,
    turnoIds: Map<string, string>,
  ) {
    return {
      codigo: c.codigo,
      nome: c.nome,
      apelido: c.apelido,
      nascimento: c.nascimento,
      nome_mae: c.nomeMae,
      cpf: c.cpf,
      cpf_verificado: c.cpfVerificado,
      endereco: c.endereco,
      telefone: c.telefone,
      email: c.email,
      cargo: c.cargo,
      situacao: c.situacao,
      cadastro_incompleto: c.cadastroIncompleto,
      setor_id: c.setorCodigo ? setorIds.get(c.setorCodigo) ?? null : null,
      turno_id: c.turnoCodigo ? turnoIds.get(c.turnoCodigo) ?? null : null,
      data_admissao: c.dataAdmissao,
      data_desligamento: c.dataDesligamento,
      desligamento_data_desconhecida: c.desligamentoDataDesconhecida,
      observacoes: c.observacoes,
      updated_at: new Date().toISOString(),
    };
  }

  private mapaIds(data: unknown): Map<string, string> {
    const mapa = new Map<string, string>();
    for (const row of (data as { id: string; codigo: string }[] | null) ?? []) {
      mapa.set(row.codigo, row.id);
    }
    return mapa;
  }
}

class ImportPessoasEtapa1 {
  private readonly args = new ImportPessoasArgs();
  private readonly env = new ImportPessoasEnv();
  private readonly csv = new CargaPessoasCsv();
  private readonly horarios = new HorariosMdLeitor();
  private readonly preview = new CargaPessoasPreview();

  async executar(argv: string[]): Promise<void> {
    const paths = this.args.parse(argv);
    const setores = this.csv.lerSetores(fs.readFileSync(paths.setores, 'utf8'));
    const colaboradores = this.csv.lerColaboradores(fs.readFileSync(paths.colaboradores, 'utf8'));
    const { turnos, dias } = this.horarios.ler(fs.readFileSync(paths.horarios, 'utf8'), setores);
    const codigosJaGravados = await this.carregarCodigos(paths.dryRun);
    const previa = this.preview.prever({ setores, turnos, colaboradores, codigosJaGravados });
    console.log(
      `inserir=${previa.inserir.length} atualizar=${previa.atualizar.length} erros=${previa.erros.length}`,
    );
    if (paths.dryRun) return;
    await this.gravar(setores, turnos, dias, colaboradores, previa);
  }

  private async carregarCodigos(dryRun: boolean): Promise<string[]> {
    this.env.carregar();
    try {
      const { supabaseClientFactory } = await import('../src/lib/clients/supabase-client-factory');
      const client = supabaseClientFactory.createServiceRoleClient();
      return await new ImportPessoasCodigosGravados().listar(client);
    } catch (err) {
      if (dryRun) return [];
      throw err;
    }
  }

  private async gravar(
    setores: CargaSetor[],
    turnos: CargaTurno[],
    dias: CargaTurnoDia[],
    colaboradores: CargaColaboradorLinha[],
    previa: { inserir: string[]; atualizar: string[] },
  ): Promise<void> {
    const { supabaseClientFactory } = await import('../src/lib/clients/supabase-client-factory');
    const client = supabaseClientFactory.createServiceRoleClient();
    const ok = new Set([...previa.inserir, ...previa.atualizar]);
    await new ImportPessoasUpsert(client).gravar(setores, turnos, dias, colaboradores, ok);
  }
}

new ImportPessoasEtapa1().executar(process.argv.slice(2)).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
