'use server';

import { ColaboradorListaRowParser } from '@/domain/pessoas/colaborador-lista-row-parser';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const COLABORADORES_SELECT =
  'codigo, nome, situacao, pessoas_setores(nome), pessoas_turnos(nome)';

export async function listColaboradores(): Promise<ColaboradorListaItem[]> {
  await requireInternoModulo('interno_pessoas', 'ler');

  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select(COLABORADORES_SELECT)
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar colaboradores: ${error.message}`);
  }

  return new ColaboradorListaRowParser().parseAll(data);
}
