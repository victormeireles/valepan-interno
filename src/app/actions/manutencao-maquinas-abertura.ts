'use server';

import {
  ManutencaoAcesso,
  MODULOS_MANUTENCAO_ENTRADA,
} from '@/domain/manutencao/manutencao-acesso';
import { ManutencaoSetoresPorModulo } from '@/domain/manutencao/manutencao-setores-por-modulo';
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { OrdemLeitura, type ClienteOrdem } from './manutencao-ordem-leitura';

export type MaquinaAberturaItem = {
  id: string;
  codigo: string;
  nome: string;
};

export async function listarMaquinasAbertura(): Promise<MaquinaAberturaItem[]> {
  const { snap } = await requireInternoQualquerModulo(MODULOS_MANUTENCAO_ENTRADA, 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  if (new ManutencaoAcesso().executaOficina(snap)) return lerAtivas(client, null);
  return lerDoEscopo(client, snap);
}

async function lerDoEscopo(
  client: ClienteOrdem,
  snap: UsuarioAuthzSnapshot,
): Promise<MaquinaAberturaItem[]> {
  const codigos = new ManutencaoSetoresPorModulo().codigosElegiveis(snap);
  const setores = await new OrdemLeitura(client).setoresPorCodigos(codigos);
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
