'use server';

import {
  EdicaoDescricaoPlano,
  type PlanoEmEdicao,
} from '@/domain/manutencao/edicao-descricao-plano';
import {
  PlanoPreventivo,
  type EntradaPlano,
  type MaquinaDoPlano,
} from '@/domain/manutencao/plano-preventivo';
import {
  ProximaDataPreventiva,
  type FrequenciaPlano,
} from '@/domain/manutencao/proxima-data-preventiva';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type FrequenciaEntrada =
  | { tipo: 'a_cada_n_dias'; intervalo: number }
  | { tipo: 'semanal'; diaSemana: number }
  | { tipo: 'mensal'; diaMes: number };

export type EntradaSalvarPlano = {
  id?: string;
  maquinaId: string;
  descricao: string;
  frequencia: FrequenciaEntrada;
  primeiraData: string;
};

type Resultado = { ok: boolean; mensagem: string };
type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type PlanoGravado = {
  id: string;
  maquina_id: string;
  ativo: boolean;
  frequencia_tipo: FrequenciaEntrada['tipo'];
  intervalo_dias: number | null;
  dia_semana: number | null;
  dia_mes: number | null;
  ancora_em: string | null;
  proxima_em: string;
};
type FrequenciaCalculada = {
  frequencia: FrequenciaPlano;
  proximaEm: string;
};
type CamposPlano = Record<string, string | number | boolean | null>;

const SALVO = 'Plano salvo.';
const REMOVIDO = 'Plano removido.';
const NAO_ENCONTRADO = 'Plano não encontrado.';

export async function salvarPlano(entrada: EntradaSalvarPlano): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const hoje = hojeSp();
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

async function criarPlano(
  client: Cliente,
  entrada: EntradaSalvarPlano,
  hoje: string,
): Promise<Resultado> {
  const frequencia = frequenciaNova(entrada);
  const maquina = await lerMaquina(client, entrada.maquinaId);
  const validacao = validar(entrada, frequencia, entrada.primeiraData, hoje, maquina);
  if (!validacao.ok) return validacao;
  const erro = await inserir(client, {
    maquina_id: entrada.maquinaId,
    descricao: validacao.descricao,
    ativo: true,
    ...colunasDaFrequencia(frequencia, validacao.proximaEm),
  });
  return resultado(erro);
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
  if (edicao.soDescricao(plano, entrada.maquinaId, entrada.frequencia)) {
    return gravarDescricao(client, id, entrada.descricao);
  }
  const maquina = await lerMaquina(client, entrada.maquinaId);
  if (edicao.mesmaFrequencia(plano, entrada.frequencia)) {
    return gravarMaquina(client, id, entrada, atual, maquina, hoje);
  }
  return gravarFrequencia(client, id, entrada, atual, maquina, hoje);
}

async function gravarDescricao(client: Cliente, id: string, descricao: string): Promise<Resultado> {
  const aceita = new EdicaoDescricaoPlano().aceitar(descricao);
  if (!aceita.ok) return aceita;
  return resultado(await atualizar(client, id, { descricao: aceita.descricao }));
}

async function gravarMaquina(
  client: Cliente,
  id: string,
  entrada: EntradaSalvarPlano,
  atual: PlanoGravado,
  maquina: MaquinaDoPlano | null,
  hoje: string,
): Promise<Resultado> {
  const frequencia = frequenciaDoPlano(atual);
  const primeiraData = dataParaValidar(atual, frequencia, hoje);
  const validacao = validar(entrada, frequencia, primeiraData, hoje, maquina);
  if (!validacao.ok) return validacao;
  return resultado(
    await atualizar(client, id, {
      maquina_id: entrada.maquinaId,
      descricao: validacao.descricao,
    }),
  );
}

async function gravarFrequencia(
  client: Cliente,
  id: string,
  entrada: EntradaSalvarPlano,
  atual: PlanoGravado,
  maquina: MaquinaDoPlano | null,
  hoje: string,
): Promise<Resultado> {
  const recalculo = new RecalculoDeFrequencia().calcular(atual, entrada.frequencia, hoje);
  const validacao = validar(entrada, recalculo.frequencia, recalculo.proximaEm, hoje, maquina);
  if (!validacao.ok) return validacao;
  const erro = await atualizar(client, id, {
    maquina_id: entrada.maquinaId,
    descricao: validacao.descricao,
    ...colunasDaFrequencia(recalculo.frequencia, recalculo.proximaEm),
  });
  return resultado(erro);
}

function validar(
  entrada: EntradaSalvarPlano,
  frequencia: FrequenciaPlano,
  primeiraData: string,
  hoje: string,
  maquina: MaquinaDoPlano | null,
) {
  return new PlanoPreventivo().validar(pedido(entrada, frequencia, primeiraData, hoje), maquina);
}

function pedido(
  entrada: EntradaSalvarPlano,
  frequencia: FrequenciaPlano,
  primeiraData: string,
  hoje: string,
): EntradaPlano {
  return {
    maquinaId: entrada.maquinaId,
    descricao: entrada.descricao,
    frequencia,
    primeiraData,
    hojeSp: hoje,
  };
}

class RecalculoDeFrequencia {
  constructor(private readonly datas = new ProximaDataPreventiva()) {}

  calcular(atual: PlanoGravado, nova: FrequenciaEntrada, hoje: string): FrequenciaCalculada {
    const frequencia = this.frequencia(atual, nova, hoje);
    return { frequencia, proximaEm: this.datas.depoisDeHoje(frequencia, hoje) };
  }

  private frequencia(atual: PlanoGravado, nova: FrequenciaEntrada, hoje: string): FrequenciaPlano {
    if (nova.tipo === 'semanal') return { tipo: 'semanal', diaSemana: nova.diaSemana };
    if (nova.tipo === 'mensal') return { tipo: 'mensal', diaMes: nova.diaMes };
    const ancora = this.datas.depoisDeHoje(this.intervalo(atual, nova.intervalo, hoje), hoje);
    return { tipo: 'a_cada_n_dias', intervalo: nova.intervalo, ancora };
  }

  private intervalo(atual: PlanoGravado, intervalo: number, hoje: string): FrequenciaPlano {
    return { tipo: 'a_cada_n_dias', intervalo, ancora: this.ancora(atual, hoje) };
  }

  private ancora(atual: PlanoGravado, hoje: string): string {
    if (atual.frequencia_tipo !== 'a_cada_n_dias' || !atual.ancora_em) return hoje;
    return dataCurta(atual.ancora_em);
  }
}

function frequenciaNova(entrada: EntradaSalvarPlano): FrequenciaPlano {
  if (entrada.frequencia.tipo !== 'a_cada_n_dias') return entrada.frequencia;
  return {
    tipo: 'a_cada_n_dias',
    intervalo: entrada.frequencia.intervalo,
    ancora: entrada.primeiraData,
  };
}

function frequenciaDoPlano(atual: PlanoGravado): FrequenciaPlano {
  if (atual.frequencia_tipo === 'a_cada_n_dias') {
    return {
      tipo: 'a_cada_n_dias',
      intervalo: atual.intervalo_dias ?? 0,
      ancora: dataCurta(atual.ancora_em ?? atual.proxima_em),
    };
  }
  if (atual.frequencia_tipo === 'semanal') {
    return { tipo: 'semanal', diaSemana: atual.dia_semana ?? 0 };
  }
  return { tipo: 'mensal', diaMes: atual.dia_mes ?? 0 };
}

function planoEmEdicao(atual: PlanoGravado): PlanoEmEdicao {
  return {
    maquinaId: atual.maquina_id,
    frequenciaTipo: atual.frequencia_tipo,
    intervaloDias: atual.intervalo_dias,
    diaSemana: atual.dia_semana,
    diaMes: atual.dia_mes,
  };
}

function dataParaValidar(atual: PlanoGravado, frequencia: FrequenciaPlano, hoje: string): string {
  const proxima = dataCurta(atual.proxima_em);
  const datas = new ProximaDataPreventiva();
  if (proxima >= hoje && datas.encaixa(frequencia, proxima)) return proxima;
  return datas.depoisDeHoje(frequencia, hoje);
}

function colunasDaFrequencia(frequencia: FrequenciaPlano, proximaEm: string): CamposPlano {
  const base: CamposPlano = {
    frequencia_tipo: frequencia.tipo,
    intervalo_dias: null,
    dia_semana: null,
    dia_mes: null,
    ancora_em: null,
    proxima_em: proximaEm,
  };
  if (frequencia.tipo === 'a_cada_n_dias') {
    return { ...base, intervalo_dias: frequencia.intervalo, ancora_em: frequencia.ancora };
  }
  if (frequencia.tipo === 'semanal') return { ...base, dia_semana: frequencia.diaSemana };
  return { ...base, dia_mes: frequencia.diaMes };
}

function hojeSp(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function dataCurta(valor: string): string {
  return valor.slice(0, 10);
}

function resultado(erro: string | null, mensagem = SALVO): Resultado {
  return erro ? { ok: false, mensagem: erro } : { ok: true, mensagem };
}

async function lerMaquina(client: Cliente, maquinaId: string): Promise<MaquinaDoPlano | null> {
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
      'id, maquina_id, ativo, frequencia_tipo, intervalo_dias, dia_semana, dia_mes, ancora_em, proxima_em',
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
