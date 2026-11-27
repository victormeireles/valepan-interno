'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { ClienteOrdem } from './manutencao-ordem-leitura';
import { AjudantesOficina } from './manutencao-ajudantes-oficina';

const MODULO_OFICINA = 'interno_manutencao';

export async function listarAjudantesOficina(
  numero: number,
): Promise<Array<{ id: string; nome: string }>> {
  await requireInternoModulo(MODULO_OFICINA, 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const receptorId = await receptorDaOrdem(client, numero);
  return new AjudantesOficina(client).listar(receptorId);
}

async function receptorDaOrdem(client: ClienteOrdem, numero: number): Promise<string | null> {
  if (!Number.isInteger(numero) || numero <= 0) return null;
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .select('recebida_por')
    .eq('numero', numero)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const linha = data as { recebida_por: string | null } | null;
  return linha?.recebida_por ?? null;
}
