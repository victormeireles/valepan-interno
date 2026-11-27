'use server';

import { revalidatePath } from 'next/cache';
import {
  EdicaoDescricaoPlano,
  type FrequenciaInformada,
  type PlanoEmEdicao,
} from '@/domain/manutencao/edicao-descricao-plano';
import { AlvoDoPlano } from '@/domain/manutencao/escopo-manutencao';
import { GravacaoFrequenciaPlano } from '@/domain/manutencao/gravacao-frequencia-plano';
import {
  PlanoPreventivo,
  type ContextoAlvoPlano,
  type EntradaPlano,
  type MaquinaDoPlano,
} from '@/domain/manutencao/plano-preventivo';
import {
  PlanoRemocao,
  type AvaliacaoRemocaoPlano,
} from '@/domain/manutencao/plano-remocao';
import type { FrequenciaPlano } from '@/domain/manutencao/proxima-data-preventiva';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { GeradorPreventivaNaFila } from './manutencao-plano-geracao';

export type FrequenciaEntrada = FrequenciaInformada;

export type EntradaSalvarPlano = {
  id?: string;
  escopo: 'maquina' | 'fabrica';
  maquinaId: string;
  descricao: string;
  frequencia: FrequenciaEntrada;
  primeiraData: string;
};

type Resultado = { ok: boolean; mensagem: string };
type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type PlanoGravado = {
  id: string;
  escopo: 'maquina' | 'fabrica';
  maquina_id: string | null;
  ativo: boolean;
  frequencia_tipo: FrequenciaEntrada['tipo'];
  intervalo_dias: number | null;
  dia_semana: number | null;
  dia_mes: number | null;
  ancora_em: string | null;
  proxima_em: string;
};
type CamposPlano = Record<string, string | number | boolean | null>;

const frequencias = new GravacaoFrequenciaPlano();
const alvos = new AlvoDoPlano();

const SALVO = 'Plano salvo.';
const REMOVIDO = 'Plano removido.';
const NAO_ENCONTRADO = 'Plano não encontrado.';

export async function salvarPlano(entrada: EntradaSalvarPlano): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const hoje = frequencias.hojeSp();
  if (entrada.id) return editarPlano(client, entrada.id, entrada, hoje);
  return criarPlano(client, entrada, hoje);
}

export async function inativarPlano(id: string): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'editar');
  const erro = await atualizar(supabaseClientFactory.createServiceRoleClient(), id, {
    ativo: false,
  });
  return resultado(erro, REMOVIDO);
}

export async function avaliarRemocaoPlano(id: string): Promise<AvaliacaoRemocaoPlano> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  return new PlanoRemocao().avaliar({
    ordens: await contarOrdensDoPlano(client, id),
  });
}

export async function removerPlano(id: string): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const avaliacao = new PlanoRemocao().avaliar({
    ordens: await contarOrdensDoPlano(client, id),
  });
  if (!avaliacao.pode) return { ok: false, mensagem: avaliacao.mensagem };
  const { data, error } = await client
    .from('manutencao_planos' as never)
    .delete()
    .eq('id', id)
    .select('id');
  if (error) {
    return {
      ok: false,
      mensagem:
        error.code === '23503'
          ? 'Não é possível remover este plano. Há vínculos que precisam ser removidos antes.'
          : error.message,
    };
  }
  if (!data || (data as unknown[]).length === 0) return { ok: false, mensagem: NAO_ENCONTRADO };
  return { ok: true, mensagem: REMOVIDO };
}

async function contarOrdensDoPlano(client: Cliente, planoId: string): Promise<number> {
  const { count, error } = await client
    .from('manutencao_ordens' as never)
    .select('*', { count: 'exact', head: true })
    .eq('plano_id', planoId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function criarPlano(
  client: Cliente,
  entrada: EntradaSalvarPlano,
  hoje: string,
): Promise<Resultado> {
  const frequencia = frequencias.nova(entrada.frequencia, entrada.primeiraData);
  const contexto = await contextoAlvo(client, entrada);
  const validacao = validar(entrada, frequencia, entrada.primeiraData, hoje, contexto);
  if (!validacao.ok) return validacao;
  const erro = await inserir(client, {
    ...colunasDoAlvo(entrada),
    descricao: validacao.descricao,
    ativo: true,
    ...frequencias.colunas(frequencia, validacao.proximaEm),
  });
  return concluir(client, erro, validacao.proximaEm, hoje);
}

async function editarPlano(
  client: Cliente,
  id: string,
  entrada: EntradaSalvarPlano,
  hoje: string,
): Promise<Resultado> {
  const atual = await lerPlano(client, id);
  if (!atual?.ativo) return { ok: false, mensagem: NAO_ENCONTRADO };
  const edicao = new EdicaoDescricaoPlano();
  const plano = planoEmEdicao(atual);
  const alvo = alvos.daEntrada(entrada.escopo, entrada.maquinaId);
  if (edicao.soDescricao(plano, alvo, entrada.frequencia)) {
    return gravarDescricao(client, id, entrada.descricao, atual.proxima_em, hoje);
  }
  const contexto = await contextoAlvo(client, entrada);
  if (edicao.mesmaFrequencia(plano, entrada.frequencia)) {
    return gravarAlvo(client, id, entrada, atual, contexto, hoje);
  }
  return gravarFrequencia(client, id, entrada, atual, contexto, hoje);
}

async function gravarDescricao(
  client: Cliente,
  id: string,
  descricao: string,
  proximaEm: string,
  hoje: string,
): Promise<Resultado> {
  const aceita = new EdicaoDescricaoPlano().aceitar(descricao);
  if (!aceita.ok) return aceita;
  const erro = await atualizar(client, id, { descricao: aceita.descricao });
  return concluir(client, erro, proximaEm, hoje);
}

async function gravarAlvo(
  client: Cliente,
  id: string,
  entrada: EntradaSalvarPlano,
  atual: PlanoGravado,
  contexto: ContextoAlvoPlano,
  hoje: string,
): Promise<Resultado> {
  const frequencia = frequencias.doPlano(atual);
  const primeiraData = frequencias.dataParaValidar(atual, frequencia, hoje);
  const validacao = validar(entrada, frequencia, primeiraData, hoje, contexto);
  if (!validacao.ok) return validacao;
  const erro = await atualizar(client, id, {
    ...colunasDoAlvo(entrada),
    descricao: validacao.descricao,
  });
  return concluir(client, erro, atual.proxima_em, hoje);
}

async function gravarFrequencia(
  client: Cliente,
  id: string,
  entrada: EntradaSalvarPlano,
  atual: PlanoGravado,
  contexto: ContextoAlvoPlano,
  hoje: string,
): Promise<Resultado> {
  const recalculo = frequencias.recalcular(atual, entrada.frequencia, hoje);
  const validacao = validar(entrada, recalculo.frequencia, recalculo.proximaEm, hoje, contexto);
  if (!validacao.ok) return validacao;
  const erro = await atualizar(client, id, {
    ...colunasDoAlvo(entrada),
    descricao: validacao.descricao,
    ...frequencias.colunas(recalculo.frequencia, recalculo.proximaEm),
  });
  return concluir(client, erro, recalculo.proximaEm, hoje);
}

function validar(
  entrada: EntradaSalvarPlano,
  frequencia: FrequenciaPlano,
  primeiraData: string,
  hoje: string,
  contexto: ContextoAlvoPlano,
) {
  return new PlanoPreventivo().validar(pedido(entrada, frequencia, primeiraData, hoje), contexto);
}

function pedido(
  entrada: EntradaSalvarPlano,
  frequencia: FrequenciaPlano,
  primeiraData: string,
  hoje: string,
): EntradaPlano {
  return {
    escopo: entrada.escopo === 'fabrica' ? 'fabrica' : 'maquina',
    maquinaId: entrada.maquinaId,
    descricao: entrada.descricao,
    frequencia,
    primeiraData,
    hojeSp: hoje,
  };
}

function colunasDoAlvo(entrada: EntradaSalvarPlano): CamposPlano {
  return alvos.colunas(alvos.daEntrada(entrada.escopo, entrada.maquinaId));
}

function planoEmEdicao(atual: PlanoGravado): PlanoEmEdicao {
  return {
    escopo: atual.escopo === 'fabrica' ? 'fabrica' : 'maquina',
    maquinaId: atual.maquina_id,
    frequenciaTipo: atual.frequencia_tipo,
    intervaloDias: atual.intervalo_dias,
    diaSemana: atual.dia_semana,
    diaMes: atual.dia_mes,
  };
}

function resultado(erro: string | null, mensagem = SALVO): Resultado {
  return erro ? { ok: false, mensagem: erro } : { ok: true, mensagem };
}

async function concluir(
  client: Cliente,
  erro: string | null,
  proximaEm: string,
  hoje: string,
): Promise<Resultado> {
  if (erro) return { ok: false, mensagem: erro };
  const mensagem = await new GeradorPreventivaNaFila().aposSalvar(client, proximaEm, hoje);
  revalidatePath('/manutencao');
  revalidatePath('/manutencao/preventiva');
  return { ok: true, mensagem };
}

async function contextoAlvo(
  client: Cliente,
  entrada: EntradaSalvarPlano,
): Promise<ContextoAlvoPlano> {
  if (entrada.escopo === 'fabrica') return { escopo: 'fabrica' };
  return { escopo: 'maquina', maquina: await lerMaquina(client, entrada.maquinaId) };
}

async function lerMaquina(client: Cliente, maquinaId: string): Promise<MaquinaDoPlano | null> {
  if (!maquinaId) return null;
  const { data, error } = await client
    .from('manutencao_maquinas' as never)
    .select('id, ativo')
    .eq('id', maquinaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MaquinaDoPlano | null) ?? null;
}

async function lerPlano(client: Cliente, id: string): Promise<PlanoGravado | null> {
  const { data, error } = await client
    .from('manutencao_planos' as never)
    .select(
      'id, escopo, maquina_id, ativo, frequencia_tipo, intervalo_dias, dia_semana, dia_mes, ancora_em, proxima_em',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PlanoGravado | null) ?? null;
}

async function inserir(client: Cliente, linha: CamposPlano): Promise<string | null> {
  const { error } = await client.from('manutencao_planos' as never).insert(linha as never);
  return error ? error.message : null;
}

async function atualizar(client: Cliente, id: string, campos: CamposPlano): Promise<string | null> {
  const { data, error } = await client
    .from('manutencao_planos' as never)
    .update({ ...campos, updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .eq('ativo', true)
    .select('id');
  if (error) return error.message;
  if (!data || (data as unknown[]).length === 0) return NAO_ENCONTRADO;
  return null;
}
