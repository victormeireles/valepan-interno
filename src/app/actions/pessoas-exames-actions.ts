'use server';

import { ExamePrazo } from '@/domain/pessoas/exame-prazo';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export type ExameRegistro = { id: string; data: string };

type ServiceClient = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;

export async function listarExamesColaborador(codigo: string): Promise<ExameRegistro[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const colaboradorId = await colaboradorIdPorCodigo(client, codigo);
  if (!colaboradorId) throw new Error('Colaborador não encontrado.');
  const { data, error } = await client
    .from('pessoas_exames' as never)
    .select('id, data')
    .eq('colaborador_id', colaboradorId)
    .order('data', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; data: string }[]).map((row) => ({
    id: row.id,
    data: String(row.data).slice(0, 10),
  }));
}

export async function registrarExameColaborador(
  codigo: string,
  data: string,
): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  let iso: string;
  try {
    iso = new ExamePrazo().validar(data, getTodayISOInBrazilTimezone());
  } catch (error) {
    return { ok: false, mensagem: error instanceof Error ? error.message : 'Não foi possível registrar o exame.' };
  }
  const client = supabaseClientFactory.createServiceRoleClient();
  const colaboradorId = await colaboradorIdPorCodigo(client, codigo);
  if (!colaboradorId) return { ok: false, mensagem: 'Colaborador não encontrado.' };
  const { error } = await client
    .from('pessoas_exames' as never)
    .insert({ colaborador_id: colaboradorId, data: iso } as never);
  if (error?.code === '23505') return { ok: false, mensagem: 'Esse exame já está registrado.' };
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Exame registrado.' };
}

export async function removerExameColaborador(id: string): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_exames' as never)
    .delete()
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, mensagem: error.message };
  if (!data || (data as unknown[]).length === 0) return { ok: false, mensagem: 'Exame não encontrado.' };
  return { ok: true, mensagem: 'Exame removido.' };
}

async function colaboradorIdPorCodigo(client: ServiceClient, codigo: string): Promise<string | null> {
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select('id')
    .eq('codigo', codigo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const id = (data as { id?: string } | null)?.id;
  return typeof id === 'string' ? id : null;
}
