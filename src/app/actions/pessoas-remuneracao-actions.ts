'use server';

import {
  RemuneracaoLinhaGravacao,
  RemuneracaoVigenciaParser,
  type LinhaRemuneracaoBanco,
} from '@/domain/pessoas/remuneracao-linha';
import { RemuneracaoPacoteNormalizador } from '@/domain/pessoas/remuneracao-pacote';
import type { RemuneracaoVigencia } from '@/domain/pessoas/remuneracao-quadro';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const SELECT_VIGENCIA =
  'id, inicio, salario_centavos, vale_transporte_centavos, vale_alimentacao_centavos, plano_saude';

type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;

export async function listarRemuneracaoColaborador(codigo: string): Promise<RemuneracaoVigencia[]> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const id = await colaboradorId(client, codigo);
  const { data, error } = await client
    .from('pessoas_remuneracao_vigencias' as never)
    .select(SELECT_VIGENCIA)
    .eq('colaborador_id', id)
    .order('inicio', { ascending: false });
  if (error) throw new Error(error.message);
  return new RemuneracaoVigenciaParser().parseAll((data ?? []) as LinhaRemuneracaoBanco[]);
}

export async function gravarRemuneracaoColaborador(
  codigo: string,
  campos: Record<string, string>,
): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  try {
    const pacote = new RemuneracaoPacoteNormalizador().normalizar(campos);
    const client = supabaseClientFactory.createServiceRoleClient();
    const id = await colaboradorId(client, codigo);
    const linha = new RemuneracaoLinhaGravacao().montar(id, pacote, new Date().toISOString());
    const { error } = await client
      .from('pessoas_remuneracao_vigencias' as never)
      .upsert(linha as never, { onConflict: 'colaborador_id,inicio' });
    if (error) return { ok: false, mensagem: error.message };
    return { ok: true, mensagem: 'Vigência gravada.' };
  } catch (error) {
    return { ok: false, mensagem: mensagemDe(error) };
  }
}

export async function apagarRemuneracaoColaborador(
  codigo: string,
  inicio: string,
): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  try {
    const client = supabaseClientFactory.createServiceRoleClient();
    const id = await colaboradorId(client, codigo);
    const { data, error } = await client
      .from('pessoas_remuneracao_vigencias' as never)
      .delete()
      .eq('colaborador_id', id)
      .eq('inicio', inicio)
      .select('id');
    if (error) return { ok: false, mensagem: error.message };
    if (!data || (data as unknown[]).length === 0) return { ok: false, mensagem: 'Vigência não encontrada.' };
    return { ok: true, mensagem: 'Vigência apagada.' };
  } catch (error) {
    return { ok: false, mensagem: mensagemDe(error) };
  }
}

async function colaboradorId(client: Cliente, codigo: string): Promise<string> {
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select('id')
    .eq('codigo', codigo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error('Colaborador não encontrado.');
  return id;
}

function mensagemDe(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível salvar.';
}
