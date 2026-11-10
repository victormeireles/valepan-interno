'use server';

import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { OrdemLeitura, type ClienteOrdem } from './manutencao-ordem-leitura';

const MODULOS_ORDEM: readonly InternoModuloId[] = [
  'interno_manutencao',
  'interno_manutencao_solicitacao',
];

export type MaquinaAberturaItem = {
  id: string;
  codigo: string;
  nome: string;
};

export async function listarMaquinasAbertura(): Promise<MaquinaAberturaItem[]> {
  const { snap, usuarioId } = await requireInternoQualquerModulo(MODULOS_ORDEM, 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  if (new ManutencaoAcesso().executaOficina(snap)) return lerAtivas(client, null);
  return lerDoEscopo(client, usuarioId);
}

async function lerDoEscopo(client: ClienteOrdem, usuarioId: string): Promise<MaquinaAberturaItem[]> {
  const setores = await new OrdemLeitura(client).setoresElegiveis(usuarioId);
  if (setores.length === 0) return [];
  return lerAtivas(client, setores);
}

async function lerAtivas(
  client: ClienteOrdem,
  setores: string[] | null,
): Promise<MaquinaAberturaItem[]> {
  const base = client
    .from('manutencao_maquinas' as never)
    .select('id, codigo, nome')
    .eq('ativo', true);
  const filtrada = setores ? base.in('setor_id', setores) : base;
  const { data, error } = await filtrada.order('codigo');
  if (error) throw new Error(error.message);
  return (data ?? []) as MaquinaAberturaItem[];
}
