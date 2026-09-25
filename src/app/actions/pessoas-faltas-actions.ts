'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

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
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  avisoAtivo: boolean;
};

export async function listFaltas(inicio: string, fim: string): Promise<FaltaListaItem[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_faltas' as never)
    .select('id, data, classificacao, justificativa, cancelada_em, pessoas_colaboradores(codigo, nome, situacao), pessoas_setores(nome), pessoas_turnos(nome)')
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false });
  if (error) throw new Error(error.message);
  const comAviso = await codigosEmAviso(client);
  return ((data ?? []) as FaltaRow[]).map((row) => paraItem(row, comAviso));
}

export async function lancarFalta(input: {
  codigo: string;
  data: string;
  classificacao: string;
  justificativa: string;
}): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const pessoa = await client
    .from('pessoas_colaboradores' as never)
    .select('id, setor_id, turno_id')
    .eq('codigo', input.codigo)
    .maybeSingle();
  if (pessoa.error || !pessoa.data) return { ok: false, mensagem: 'Colaborador não encontrado.' };
  const row = pessoa.data as { id: string; setor_id: string | null; turno_id: string | null };
  const insert = await client.from('pessoas_faltas' as never).insert({
    colaborador_id: row.id,
    data: input.data,
    classificacao: input.classificacao,
    justificativa: input.justificativa.trim() || null,
    setor_id: row.setor_id,
    turno_id: row.turno_id,
  } as never);
  if (insert.error) return { ok: false, mensagem: insert.error.message };
  return { ok: true, mensagem: 'Falta registrada.' };
}

export async function editarFalta(
  id: string,
  input: { classificacao: string; justificativa: string },
): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client
    .from('pessoas_faltas' as never)
    .update({ classificacao: input.classificacao, justificativa: input.justificativa.trim() || null } as never)
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
  cancelada_em: string | null;
  pessoas_colaboradores: PessoaFalta | PessoaFalta[] | null;
  pessoas_setores: { nome: string } | { nome: string }[] | null;
  pessoas_turnos: { nome: string } | { nome: string }[] | null;
};

type PessoaFalta = { codigo: string; nome: string; situacao: FaltaListaItem['situacao'] };

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
