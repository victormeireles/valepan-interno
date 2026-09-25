'use server';

import { ExtraConflito } from '@/domain/pessoas/extra-conflito';
import { ExtraServico, type EstadoServico } from '@/domain/pessoas/extra-servico';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type ExtraListaItem = {
  id: string;
  nome: string;
  disponivel: boolean;
};

export type ServicoListaItem = {
  id: string;
  nome: string;
  setor: string;
  inicio: string;
  fim: string;
  estado: string;
  total: number | null;
  pago: boolean;
};

const regras = new ExtraServico();

export async function listExtras(): Promise<{ pessoas: ExtraListaItem[]; servicos: ServicoListaItem[] }> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const pessoas = await client.from('pessoas_extras' as never).select('id, nome, disponivel').order('nome');
  const servicos = await client
    .from('pessoas_servicos' as never)
    .select('id, inicio, fim, precisa_passagem, valor_passagem_centavos, valor_extra_centavos, estado, pago_em, estornado_em, pessoas_extras(nome), pessoas_setores(nome)')
    .order('inicio', { ascending: false });
  if (pessoas.error) throw new Error(pessoas.error.message);
  if (servicos.error) throw new Error(servicos.error.message);
  return {
    pessoas: (pessoas.data ?? []) as ExtraListaItem[],
    servicos: ((servicos.data ?? []) as ServicoRow[]).map(paraServico),
  };
}

export async function criarPessoaExtra(nome: string, telefone: string): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client.from('pessoas_extras' as never).insert({ nome, telefone: telefone || null } as never);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Pessoa extra cadastrada.' };
}

export async function criarServicoExtra(input: {
  pessoaId: string;
  setorId: string;
  inicio: string;
  fim: string;
  valorExtra: number;
  precisaPassagem: boolean;
  valorPassagem: number | null;
}): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  if (!regras.horarioValido(input.inicio, input.fim)) {
    return { ok: false, mensagem: 'O término precisa ser depois do início.' };
  }
  const client = supabaseClientFactory.createServiceRoleClient();
  const anteriores = await client
    .from('pessoas_servicos' as never)
    .select('inicio, fim')
    .eq('pessoa_extra_id', input.pessoaId)
    .neq('estado', 'cancelado');
  if (anteriores.error) return { ok: false, mensagem: anteriores.error.message };
  const conflito = new ExtraConflito().classificar(
    (anteriores.data ?? []) as { inicio: string; fim: string }[],
    input.inicio,
    input.fim,
  );
  if (conflito === 'exato') return { ok: false, mensagem: 'Já existe serviço nesse período.' };
  const { error } = await client.from('pessoas_servicos' as never).insert({
    pessoa_extra_id: input.pessoaId,
    setor_id: input.setorId,
    inicio: input.inicio,
    fim: input.fim,
    valor_extra_centavos: input.valorExtra,
    precisa_passagem: input.precisaPassagem,
    valor_passagem_centavos: input.precisaPassagem ? input.valorPassagem : 0,
    estado: 'programado',
  } as never);
  if (error) return { ok: false, mensagem: error.message };
  if (conflito === 'sobreposicao') {
    return { ok: true, mensagem: 'Serviço registrado. Há outro período no mesmo intervalo.' };
  }
  return { ok: true, mensagem: 'Serviço registrado.' };
}

export async function realizarServico(id: string): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client
    .from('pessoas_servicos' as never)
    .update({ estado: 'realizado' } as never)
    .eq('id', id)
    .is('pago_em', null);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Serviço marcado como realizado.' };
}

export async function pagarServico(id: string): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const atual = await client.from('pessoas_servicos' as never).select('*').eq('id', id).maybeSingle();
  if (atual.error || !atual.data) return { ok: false, mensagem: 'Serviço não encontrado.' };
  const row = atual.data as ServicoPagamento;
  if (row.pago_em && !row.estornado_em) return { ok: false, mensagem: 'Estorne o pagamento antes de alterar.' };
  if (!regras.podePagar(paraRegra(row))) return { ok: false, mensagem: 'Só um serviço realizado com total fechado pode ser pago.' };
  const { error } = await client
    .from('pessoas_servicos' as never)
    .update({ pago_em: new Date().toISOString(), estornado_em: null, motivo_estorno: null } as never)
    .eq('id', id);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Pagamento integral registrado.' };
}

export async function estornarServico(id: string, motivo: string): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client
    .from('pessoas_servicos' as never)
    .update({ estornado_em: new Date().toISOString(), motivo_estorno: motivo } as never)
    .eq('id', id);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Pagamento estornado.' };
}

export async function listSetoresExtra(): Promise<{ id: string; nome: string }[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client.from('pessoas_setores' as never).select('id, nome').order('nome');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; nome: string }[];
}

type ServicoRow = {
  id: string;
  inicio: string;
  fim: string;
  precisa_passagem: boolean;
  valor_passagem_centavos: number | null;
  valor_extra_centavos: number;
  estado: EstadoServico;
  pago_em: string | null;
  estornado_em: string | null;
  pessoas_extras: { nome: string } | { nome: string }[] | null;
  pessoas_setores: { nome: string } | { nome: string }[] | null;
};

type ServicoPagamento = {
  estado: EstadoServico;
  valor_extra_centavos: number;
  precisa_passagem: boolean;
  valor_passagem_centavos: number | null;
  inicio: string;
  fim: string;
  pago_em: string | null;
  estornado_em: string | null;
};

function nome(valor: { nome: string } | { nome: string }[] | null): string {
  if (!valor) return '';
  return Array.isArray(valor) ? valor[0]?.nome ?? '' : valor.nome;
}

function paraRegra(row: ServicoPagamento) {
  return {
    valorExtraCentavos: row.valor_extra_centavos,
    precisaPassagem: row.precisa_passagem,
    valorPassagemCentavos: row.valor_passagem_centavos,
    inicio: row.inicio,
    fim: row.fim,
    estado: row.estado,
  };
}

function paraServico(row: ServicoRow): ServicoListaItem {
  const total = regras.totalCentavos(paraRegra(row));
  return {
    id: row.id,
    nome: nome(row.pessoas_extras),
    setor: nome(row.pessoas_setores),
    inicio: row.inicio,
    fim: row.fim,
    estado: row.estado,
    total,
    pago: Boolean(row.pago_em) && !row.estornado_em,
  };
}
