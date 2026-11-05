'use server';

import {
  RemuneracaoLinhaGravacao,
  RemuneracaoVigenciaParser,
  type LinhaRemuneracaoBanco,
} from '@/domain/pessoas/remuneracao-linha';
import { PlanoSaudeNascimento } from '@/domain/pessoas/plano-saude-nascimento';
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
  const id = (await colaboradorRef(client, codigo)).id;
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
    const pessoa = await colaboradorRef(client, codigo);
    new PlanoSaudeNascimento().conferir(pacote.planoSaude, pessoa.nascimento);
    const linha = new RemuneracaoLinhaGravacao().montar(pessoa.id, pacote, new Date().toISOString());
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
    const id = (await colaboradorRef(client, codigo)).id;
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

async function colaboradorRef(client: Cliente, codigo: string): Promise<{ id: string; nascimento: string | null }> {
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select('id, nascimento')
    .eq('codigo', codigo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const linha = data as { id?: string; nascimento?: string | null } | null;
  if (!linha?.id) throw new Error('Colaborador não encontrado.');
  return { id: linha.id, nascimento: typeof linha.nascimento === 'string' ? linha.nascimento : null };
}

function mensagemDe(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível salvar.';
}
