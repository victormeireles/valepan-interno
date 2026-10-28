'use server';

import { FaltaCampos, type FaltaEdicaoPatch, type FaltaPayloadCampos } from '@/domain/pessoas/falta-campos';
import { FaltaJanelaResumo, type FaltaJanelaContagem, type FaltaJanelaEntrada } from '@/domain/pessoas/falta-janela-resumo';
import { FaltaLancamento } from '@/domain/pessoas/falta-lancamento';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { extractCalendarDate, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

type ServiceClient = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type ColaboradorFalta = { id: string; setor_id: string | null; turno_id: string | null };

export type FaltaListaItem = {
  id: string;
  codigo: string;
  nome: string;
  data: string;
  classificacao: string;
  justificativa: string | null;
  cancelada: boolean;
  setorNome: string | null;
  turnoNome: string | null;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado' | 'afastado';
  avisoAtivo: boolean;
  medida: string | null;
  temAnexo: boolean;
};

export type LancarFaltaResultado = { ok: boolean; mensagem: string; ids: string[] };

export async function resumoFaltasRecentes(codigo: string): Promise<FaltaJanelaContagem | null> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const pessoa = await colaboradorPorCodigo(client, codigo);
  if (!pessoa) return null;
  return new FaltaJanelaResumo().contar(await faltasDaJanela(client, pessoa.id));
}

export async function listFaltas(inicio: string, fim: string): Promise<FaltaListaItem[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_faltas' as never)
    .select('id, data, classificacao, justificativa, medida, anexo_storage_path, cancelada_em, pessoas_colaboradores(codigo, nome, situacao), pessoas_setores(nome), pessoas_turnos(nome)')
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false });
  if (error) throw new Error(error.message);
  const comAviso = await codigosEmAviso(client);
  return ((data ?? []) as FaltaRow[]).map((row) => paraItem(row, comAviso));
}

export async function lancarFalta(input: {
  codigo: string;
  datas: string[];
  classificacao: string;
  justificativa: string;
  medida?: string;
}): Promise<LancarFaltaResultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const pessoa = await colaboradorPorCodigo(client, input.codigo);
  if (!pessoa) return { ok: false, mensagem: 'Colaborador não encontrado.', ids: [] };
  try {
    return await inserirFaltas(client, pessoa, input);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Não foi possível lançar a falta.';
    return { ok: false, mensagem, ids: [] };
  }
}

export async function editarFalta(
  id: string,
  input: { classificacao: string; justificativa: string; medida?: string },
): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const patch = montarPatchEdicao(input);
  if ('erro' in patch) return { ok: false, mensagem: patch.erro };
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client
    .from('pessoas_faltas' as never)
    .update(patch.valores as never)
    .eq('id', id)
    .is('cancelada_em', null);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Falta atualizada.' };
}

export async function cancelarFalta(id: string, motivo: string): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client
    .from('pessoas_faltas' as never)
    .update({ cancelada_em: new Date().toISOString(), motivo_cancelamento: motivo } as never)
    .eq('id', id);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Falta cancelada.' };
}

type FaltaRow = {
  id: string;
  data: string;
  classificacao: string;
  justificativa: string | null;
  medida: string | null;
  anexo_storage_path: string | null;
  cancelada_em: string | null;
  pessoas_colaboradores: PessoaFalta | PessoaFalta[] | null;
  pessoas_setores: { nome: string } | { nome: string }[] | null;
  pessoas_turnos: { nome: string } | { nome: string }[] | null;
};

type PessoaFalta = { codigo: string; nome: string; situacao: FaltaListaItem['situacao'] };

type FaltaJanelaRow = {
  classificacao: string;
  medida: string | null;
  cancelada_em: string | null;
};

function paraItem(row: FaltaRow, comAviso: Set<string>): FaltaListaItem {
  const pessoa = Array.isArray(row.pessoas_colaboradores)
    ? row.pessoas_colaboradores[0]
    : row.pessoas_colaboradores;
  const codigo = pessoa?.codigo ?? '';
  return {
    id: row.id,
    codigo,
    nome: pessoa?.nome ?? '',
    data: row.data,
    classificacao: row.classificacao,
    justificativa: row.justificativa,
    cancelada: Boolean(row.cancelada_em),
    setorNome: nomeDe(row.pessoas_setores),
    turnoNome: nomeDe(row.pessoas_turnos),
    situacao: pessoa?.situacao ?? 'ativo',
    avisoAtivo: comAviso.has(codigo),
    medida: row.medida,
    temAnexo: Boolean(row.anexo_storage_path),
  };
}

async function codigosEmAviso(client: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>): Promise<Set<string>> {
  const avisos = await client
    .from('pessoas_avisos' as never)
    .select('pessoas_colaboradores(codigo)')
    .eq('situacao', 'ativo');
  if (avisos.error) throw new Error(avisos.error.message);
  return new Set(
    ((avisos.data ?? []) as { pessoas_colaboradores: { codigo: string } | { codigo: string }[] | null }[])
      .map((row) => {
        const pessoa = row.pessoas_colaboradores;
        return Array.isArray(pessoa) ? pessoa[0]?.codigo : pessoa?.codigo;
      })
      .filter((codigo): codigo is string => Boolean(codigo)),
  );
}

function nomeDe(valor: { nome: string } | { nome: string }[] | null): string | null {
  if (!valor) return null;
  const nome = Array.isArray(valor) ? valor[0]?.nome : valor.nome;
  return nome || null;
}

async function colaboradorPorCodigo(client: ServiceClient, codigo: string): Promise<ColaboradorFalta | null> {
  const pessoa = await client
    .from('pessoas_colaboradores' as never)
    .select('id, setor_id, turno_id')
    .eq('codigo', codigo)
    .maybeSingle();
  if (pessoa.error || !pessoa.data) return null;
  return pessoa.data as ColaboradorFalta;
}

async function inserirFaltas(
  client: ServiceClient,
  pessoa: ColaboradorFalta,
  input: { datas: string[]; classificacao: string; justificativa: string; medida?: string },
): Promise<LancarFaltaResultado> {
  const campos = normalizarCampos(input);
  if ('erro' in campos) return { ok: false, mensagem: campos.erro, ids: [] };
  const lancamento = new FaltaLancamento();
  const pedidas = lancamento.normalizar(input.datas);
  const ocupadas = await datasComFalta(client, pessoa.id, pedidas);
  const { livres, repetidas } = lancamento.separar(pedidas, ocupadas);
  if (livres.length === 0) return { ok: false, mensagem: lancamento.mensagem(0, repetidas), ids: [] };
  const gravacao = await client
    .from('pessoas_faltas' as never)
    .insert(linhasFalta(pessoa, livres, campos.valores) as never)
    .select('id');
  if (gravacao.error?.code === '23505') {
    return { ok: false, mensagem: 'Já existe falta ativa em alguma dessas datas.', ids: [] };
  }
  if (gravacao.error) return { ok: false, mensagem: gravacao.error.message, ids: [] };
  return {
    ok: true,
    mensagem: lancamento.mensagem(livres.length, repetidas),
    ids: ((gravacao.data ?? []) as { id: string }[]).map((linha) => linha.id),
  };
}

async function faltasDaJanela(client: ServiceClient, colaboradorId: string): Promise<FaltaJanelaEntrada[]> {
  const { inicio, fim } = new FaltaJanelaResumo().periodo(getTodayISOInBrazilTimezone());
  const consulta = await client
    .from('pessoas_faltas' as never)
    .select('classificacao, medida, cancelada_em')
    .eq('colaborador_id', colaboradorId)
    .gte('data', inicio)
    .lte('data', fim);
  if (consulta.error) throw new Error(consulta.error.message);
  return ((consulta.data ?? []) as FaltaJanelaRow[]).map(paraJanela);
}

function paraJanela(row: FaltaJanelaRow): FaltaJanelaEntrada {
  return {
    classificacao: row.classificacao,
    medida: row.medida,
    cancelada: Boolean(row.cancelada_em),
  };
}

async function datasComFalta(client: ServiceClient, colaboradorId: string, datas: string[]): Promise<string[]> {
  const existentes = await client
    .from('pessoas_faltas' as never)
    .select('data')
    .eq('colaborador_id', colaboradorId)
    .in('data', datas)
    .is('cancelada_em', null);
  if (existentes.error) throw new Error(existentes.error.message);
  return ((existentes.data ?? []) as { data: string }[]).map((row) => extractCalendarDate(row.data));
}

function linhasFalta(
  pessoa: ColaboradorFalta,
  datas: string[],
  campos: FaltaPayloadCampos,
) {
  return datas.map((data) => ({
    colaborador_id: pessoa.id,
    data,
    classificacao: campos.classificacao,
    justificativa: campos.justificativa,
    medida: campos.medida,
    setor_id: pessoa.setor_id,
    turno_id: pessoa.turno_id,
  }));
}

function normalizarCampos(input: {
  classificacao: string;
  justificativa: string;
  medida?: string;
}): { valores: FaltaPayloadCampos } | { erro: string } {
  try {
    return { valores: new FaltaCampos().normalizar({ ...input, medida: input.medida ?? '' }) };
  } catch (error) {
    return { erro: error instanceof Error ? error.message : 'Dados da falta inválidos.' };
  }
}

function montarPatchEdicao(input: {
  classificacao: string;
  justificativa: string;
  medida?: string;
}): { valores: FaltaEdicaoPatch } | { erro: string } {
  try {
    return { valores: new FaltaCampos().patchEdicao(input) };
  } catch (error) {
    return { erro: error instanceof Error ? error.message : 'Dados da falta inválidos.' };
  }
}
