'use server';

import { atualizarCadastroColaborador } from '@/app/actions/pessoas-cadastro-actions';
import { ColaboradorCadastroNormalizador } from '@/domain/pessoas/colaborador-cadastro';
import { NomeCapitalizador } from '@/domain/pessoas/nome-capitalizador';
import { VinculoRegras } from '@/domain/pessoas/vinculo-regras';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type VinculoResultado = { ok: boolean; mensagem: string };

async function rpc(nome: string, args: Record<string, string | boolean | null>): Promise<VinculoResultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client.rpc(nome as never, args as never);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Operação registrada.' };
}

export async function admitirColaborador(codigo: string, data: string): Promise<VinculoResultado> {
  return rpc('pessoas_admitir', { p_codigo: codigo, p_data: data });
}

export async function desistirAdmissao(codigo: string): Promise<VinculoResultado> {
  return rpc('pessoas_desistir', { p_codigo: codigo });
}

export async function transferirColaborador(
  codigo: string,
  turno: string,
  lider: boolean,
): Promise<VinculoResultado> {
  return rpc('pessoas_transferir', { p_codigo: codigo, p_turno: turno, p_lider: lider });
}

export async function desligarColaborador(codigo: string, data: string, tipo: string): Promise<VinculoResultado> {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  let futuro = false;
  try {
    futuro = new VinculoRegras().desligar(data, hoje, tipo).futuro;
  } catch (error) {
    return { ok: false, mensagem: error instanceof Error ? error.message : 'Não foi possível desligar.' };
  }
  const resultado = await rpc('pessoas_desligar', { p_codigo: codigo, p_data: data, p_tipo: tipo });
  if (!resultado.ok) return resultado;
  return {
    ok: true,
    mensagem: futuro ? 'Aviso registrado. A pessoa permanece no quadro até a data.' : 'Colaborador desligado.',
  };
}

export async function admitirNovo(
  nome: string,
  turno: string,
  data: string,
  campos: Record<string, string>,
): Promise<VinculoResultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  try {
    new ColaboradorCadastroNormalizador().normalizar(campos);
  } catch (error) {
    return { ok: false, mensagem: error instanceof Error ? error.message : 'Não foi possível admitir.' };
  }
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data: codigo, error } = await client.rpc('pessoas_admitir_novo' as never, {
    p_nome: new NomeCapitalizador().formatar(nome),
    p_turno: turno,
    p_data: data,
  } as never);
  if (error) return { ok: false, mensagem: error.message };
  if (typeof codigo !== 'string' || !codigo) return { ok: false, mensagem: 'Não foi possível gerar o código.' };
  const cadastro = await atualizarCadastroColaborador(codigo, campos);
  if (!cadastro.ok) return cadastro;
  return { ok: true, mensagem: 'Colaborador admitido.' };
}

export type TurnoOpcao = { codigo: string; nome: string; setorNome: string };

export async function listTurnosVinculo(): Promise<TurnoOpcao[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_turnos' as never)
    .select('codigo, nome, pessoas_setores(nome)')
    .order('nome');
  if (error) throw new Error(error.message);
  return ((data ?? []) as TurnoRow[]).map((row) => ({
    codigo: row.codigo,
    nome: row.nome,
    setorNome: nomeSetor(row.pessoas_setores),
  }));
}

type TurnoRow = {
  codigo: string;
  nome: string;
  pessoas_setores: { nome: string } | { nome: string }[] | null;
};

function nomeSetor(valor: TurnoRow['pessoas_setores']): string {
  if (!valor) return '';
  return Array.isArray(valor) ? valor[0]?.nome ?? '' : valor.nome;
}
