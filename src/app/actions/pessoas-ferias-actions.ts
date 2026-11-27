'use server';

import { FeriasRegras, type ContextoFerias } from '@/domain/pessoas/ferias-regras';
import { FeriasPeriodo, type PeriodoFerias } from '@/domain/pessoas/ferias-periodo';
import type { Regime } from '@/domain/pessoas/regime-cadastro';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

type ServiceClient = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type Resultado = { ok: boolean; mensagem: string };
type PeriodoAberto = PeriodoFerias & { id: string };

const regras = new FeriasRegras();
const periodo = new FeriasPeriodo();

export async function lancarFerias(codigo: string, inicio: string, volta: string): Promise<Resultado> {
  return gravar(codigo, inicio, volta, false);
}

export async function alterarFerias(codigo: string, inicio: string, volta: string): Promise<Resultado> {
  return gravar(codigo, inicio, volta, true);
}

export async function cancelarFerias(codigo: string): Promise<Resultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const hoje = getTodayISOInBrazilTimezone();
  const pessoa = await carregarPessoa(client, codigo);
  if (!pessoa) return { ok: false, mensagem: 'Colaborador não encontrado.' };
  const aberto = await periodoAberto(client, pessoa.id, hoje);
  if (!aberto) return { ok: false, mensagem: 'Não há férias em aberto.' };
  try {
    regras.cancelar(aberto, hoje);
  } catch (error) {
    return falha(error);
  }
  const { error } = await client
    .from('pessoas_ferias' as never)
    .update({ cancelada_em: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
    .eq('id', aberto.id)
    .is('cancelada_em', null);
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.message) };
  return { ok: true, mensagem: 'Férias canceladas.' };
}

async function gravar(codigo: string, inicio: string, volta: string, alterar: boolean): Promise<Resultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const hoje = getTodayISOInBrazilTimezone();
  const pessoa = await carregarPessoa(client, codigo);
  if (!pessoa) return { ok: false, mensagem: 'Colaborador não encontrado.' };
  const abertos = await periodosAbertos(client, pessoa.id);
  const atual = escolherAberto(abertos, hoje);
  const contexto = await contextoDe(client, pessoa, abertos, alterar ? atual : null, inicio, volta, hoje);
  try {
    const datas = alterar
      ? regras.alterar(atual ?? { inicio: '', volta: '' }, inicio, volta, hoje, contexto)
      : regras.lancar(inicio, volta, hoje, contexto);
    const error = alterar ? await atualizar(client, atual?.id ?? '', datas) : await inserir(client, pessoa.id, datas);
    if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
    return { ok: true, mensagem: alterar ? 'Férias atualizadas.' : 'Férias lançadas.' };
  } catch (error) {
    return falha(error);
  }
}

async function contextoDe(
  client: ServiceClient,
  pessoa: PessoaRow,
  abertos: PeriodoAberto[],
  atual: PeriodoAberto | null,
  inicio: string,
  volta: string,
  hoje: string,
): Promise<ContextoFerias> {
  return {
    situacao: pessoa.situacao,
    avisoAtivo: await temAviso(client, pessoa.id),
    regime: pessoa.regime ?? 'clt',
    dataDesligamento: pessoa.data_desligamento,
    outrosPeriodos: abertos.filter((item) => item.id !== atual?.id),
    faltasAtivas: await faltasNoIntervalo(client, pessoa.id, inicio, volta, hoje),
  };
}

async function carregarPessoa(client: ServiceClient, codigo: string): Promise<PessoaRow | null> {
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select('id, situacao, regime, data_desligamento')
    .eq('codigo', codigo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PessoaRow | null) ?? null;
}

async function periodosAbertos(client: ServiceClient, colaboradorId: string): Promise<PeriodoAberto[]> {
  const { data, error } = await client
    .from('pessoas_ferias' as never)
    .select('id, inicio, volta')
    .eq('colaborador_id', colaboradorId)
    .is('cancelada_em', null);
  if (error) throw new Error(error.message);
  return (data ?? []) as PeriodoAberto[];
}

async function periodoAberto(client: ServiceClient, colaboradorId: string, hoje: string): Promise<PeriodoAberto | null> {
  return escolherAberto(await periodosAbertos(client, colaboradorId), hoje);
}

function escolherAberto(periodos: PeriodoAberto[], hoje: string): PeriodoAberto | null {
  const abertos = periodos.filter((item) => periodo.aberto(item, hoje));
  return abertos.find((item) => periodo.estado(item, hoje) === 'em_gozo') ?? abertos[0] ?? null;
}

async function temAviso(client: ServiceClient, colaboradorId: string): Promise<boolean> {
  const { data, error } = await client
    .from('pessoas_avisos' as never)
    .select('id')
    .eq('colaborador_id', colaboradorId)
    .eq('situacao', 'ativo')
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function faltasNoIntervalo(
  client: ServiceClient,
  colaboradorId: string,
  inicio: string,
  volta: string,
  hoje: string,
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(volta) || volta <= inicio) return [];
  if (inicio < hoje && volta <= hoje) return [];
  const { data, error } = await client
    .from('pessoas_faltas' as never)
    .select('data')
    .eq('colaborador_id', colaboradorId)
    .is('cancelada_em', null)
    .gte('data', inicio)
    .lt('data', volta);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { data: string }[]).map((row) => row.data);
}

async function inserir(client: ServiceClient, colaboradorId: string, datas: { inicio: string; volta: string }): Promise<string | null> {
  const { error } = await client.from('pessoas_ferias' as never).insert({
    colaborador_id: colaboradorId,
    inicio: datas.inicio,
    volta: datas.volta,
  } as never);
  return error?.message ?? null;
}

async function atualizar(client: ServiceClient, id: string, datas: { inicio: string; volta: string }): Promise<string | null> {
  const { error } = await client
    .from('pessoas_ferias' as never)
    .update({ inicio: datas.inicio, volta: datas.volta, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  return error?.message ?? null;
}

function mensagemDoBanco(mensagem: string): string {
  if (mensagem.includes('Já existe férias nesse período.')) return 'Já existe férias nesse período.';
  if (mensagem.includes('pessoas_ferias_volta_posterior')) return 'A volta precisa ser depois do início.';
  return mensagem;
}

function falha(error: unknown): Resultado {
  return { ok: false, mensagem: error instanceof Error ? error.message : 'Não foi possível salvar as férias.' };
}

type PessoaRow = {
  id: string;
  situacao: string;
  regime: Regime | null;
  data_desligamento: string | null;
};
