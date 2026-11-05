'use server';

import { revalidatePath } from 'next/cache';
import {
  PlanoSaudeFaixaConflito,
  PlanoSaudeFaixaLeitura,
  PlanoSaudeFaixaNormalizador,
  type PlanoSaudeFaixa,
  type PlanoSaudeFaixaEntrada,
} from '@/domain/pessoas/plano-saude-faixa';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const CAMINHO = '/config/plano-saude';

export type PlanoSaudeFaixaForm = { id?: string; idadeMin: string; idadeMax: string; valor: string };
export type PlanoSaudeResultado = { ok: true } | { ok: false; erro: string };

export async function listarPlanoSaudeFaixas(): Promise<PlanoSaudeFaixa[]> {
  await requireInternoModulo('interno_config', 'ler');
  return lerFaixas();
}

export async function gravarPlanoSaudeFaixa(form: PlanoSaudeFaixaForm): Promise<PlanoSaudeResultado> {
  await requireInternoModulo('interno_config', 'administrar');
  try {
    const entrada = new PlanoSaudeFaixaNormalizador().normalizar(form);
    if (new PlanoSaudeFaixaConflito().cruza(await lerFaixas(), entrada, form.id)) {
      return { ok: false, erro: 'Esta faixa cruza outra.' };
    }
    await persistir(form.id, entrada);
    revalidar();
    return { ok: true };
  } catch (error) {
    return { ok: false, erro: error instanceof Error ? error.message : 'Não foi possível gravar a faixa.' };
  }
}

export async function apagarPlanoSaudeFaixa(id: string): Promise<PlanoSaudeResultado> {
  await requireInternoModulo('interno_config', 'administrar');
  const resultado = await supabaseClientFactory
    .createServiceRoleClient()
    .from('pessoas_plano_saude_faixas' as never)
    .delete()
    .eq('id', id);
  if (resultado.error) return { ok: false, erro: 'Não foi possível apagar a faixa.' };
  revalidar();
  return { ok: true };
}

async function lerFaixas(): Promise<PlanoSaudeFaixa[]> {
  const resultado = await supabaseClientFactory
    .createServiceRoleClient()
    .from('pessoas_plano_saude_faixas' as never)
    .select('id, idade_min, idade_max, valor_centavos, ordem')
    .order('idade_min');
  if (resultado.error) throw new Error('Não foi possível ler as faixas do plano de saúde.');
  return new PlanoSaudeFaixaLeitura().parseAll(resultado.data);
}

async function persistir(id: string | undefined, entrada: PlanoSaudeFaixaEntrada): Promise<void> {
  const client = supabaseClientFactory.createServiceRoleClient();
  const linha = {
    idade_min: entrada.idadeMin,
    idade_max: entrada.idadeMax,
    valor_centavos: entrada.valorCentavos,
    ordem: entrada.idadeMin,
    updated_at: new Date().toISOString(),
  };
  const resultado = id
    ? await client.from('pessoas_plano_saude_faixas' as never).update(linha as never).eq('id', id)
    : await client.from('pessoas_plano_saude_faixas' as never).insert(linha as never);
  if (resultado.error) throw new Error('Não foi possível gravar a faixa.');
}

function revalidar(): void {
  revalidatePath(CAMINHO);
  revalidatePath('/pessoas/folha');
}
