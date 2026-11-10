'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type PlanoItem = {
  id: string;
  maquinaId: string;
  maquinaCodigo: string;
  maquinaNome: string;
  descricao: string;
  frequenciaTipo: FrequenciaTipo;
  intervaloDias: number | null;
  diaSemana: number | null;
  diaMes: number | null;
  proximaEm: string;
  temOrdemAberta: boolean;
};

type FrequenciaTipo = 'a_cada_n_dias' | 'semanal' | 'mensal';
type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type PlanoRow = {
  id: string;
  maquina_id: string;
  descricao: string;
  frequencia_tipo: FrequenciaTipo;
  intervalo_dias: number | null;
  dia_semana: number | null;
  dia_mes: number | null;
  proxima_em: string;
};
type MaquinaRow = { id: string; codigo: string; nome: string };
type OrdemPlano = { plano_id: string | null };

export async function listarPlanos(): Promise<PlanoItem[]> {
  await requireInternoModulo('interno_manutencao', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const planos = await lerPlanosAtivos(client);
  const maquinas = await lerMaquinas(client, planos.map((plano) => plano.maquina_id));
  const abertas = await lerPlanosComOrdemAberta(client, planos.map((plano) => plano.id));
  return planos.map((plano) => paraItem(plano, maquinas, abertas)).sort(porProxima);
}

async function lerPlanosAtivos(client: Cliente): Promise<PlanoRow[]> {
  const { data, error } = await client
    .from('manutencao_planos' as never)
    .select(
      'id, maquina_id, descricao, frequencia_tipo, intervalo_dias, dia_semana, dia_mes, proxima_em',
    )
    .eq('ativo', true);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanoRow[];
}

async function lerMaquinas(client: Cliente, ids: string[]): Promise<Map<string, MaquinaRow>> {
  const unicos = idsUnicos(ids);
  if (unicos.length === 0) return new Map();
  const { data, error } = await client
    .from('manutencao_maquinas' as never)
    .select('id, codigo, nome')
    .in('id', unicos);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as MaquinaRow[]).map((maquina) => [maquina.id, maquina]));
}

async function lerPlanosComOrdemAberta(client: Cliente, ids: string[]): Promise<Set<string>> {
  const unicos = idsUnicos(ids);
  if (unicos.length === 0) return new Set();
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .select('plano_id')
    .in('plano_id', unicos)
    .in('status', ['aberta', 'recebida']);
  if (error) throw new Error(error.message);
  return idsDeOrdem((data ?? []) as OrdemPlano[]);
}

function idsDeOrdem(ordens: OrdemPlano[]): Set<string> {
  return new Set(
    ordens.map((ordem) => ordem.plano_id).filter((id): id is string => Boolean(id)),
  );
}

function idsUnicos(ids: string[]): string[] {
  return [...new Set(ids)];
}

function paraItem(
  plano: PlanoRow,
  maquinas: Map<string, MaquinaRow>,
  abertas: Set<string>,
): PlanoItem {
  const maquina = maquinas.get(plano.maquina_id);
  return {
    id: plano.id,
    maquinaId: plano.maquina_id,
    maquinaCodigo: maquina?.codigo ?? '',
    maquinaNome: maquina?.nome ?? '',
    descricao: plano.descricao,
    frequenciaTipo: plano.frequencia_tipo,
    intervaloDias: plano.intervalo_dias,
    diaSemana: plano.dia_semana,
    diaMes: plano.dia_mes,
    proximaEm: plano.proxima_em.slice(0, 10),
    temOrdemAberta: abertas.has(plano.id),
  };
}

function porProxima(esquerda: PlanoItem, direita: PlanoItem): number {
  const data = esquerda.proximaEm.localeCompare(direita.proximaEm);
  if (data !== 0) return data;
  return esquerda.maquinaNome.localeCompare(direita.maquinaNome, 'pt-BR');
}
