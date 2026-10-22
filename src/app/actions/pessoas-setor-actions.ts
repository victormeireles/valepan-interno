'use server';

import { SetorCodigo } from '@/domain/pessoas/setor-codigo';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type SetorResultado = { ok: boolean; mensagem: string };

export async function criarSetor(entrada: {
  nome: string;
  tipo: 'operacional' | 'apoio';
}): Promise<SetorResultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const nome = entrada.nome.trim();
  if (!nome) return { ok: false, mensagem: 'Informe o nome do setor.' };
  if (entrada.tipo !== 'operacional' && entrada.tipo !== 'apoio') {
    return { ok: false, mensagem: 'Tipo de setor inválido.' };
  }
  const client = supabaseClientFactory.createServiceRoleClient();
  const existentes = await client.from('pessoas_setores' as never).select('codigo, nome, ordem');
  if (existentes.error) return { ok: false, mensagem: existentes.error.message };
  const linhas = (existentes.data ?? []) as { codigo: string; nome: string; ordem: number }[];
  if (linhas.some((item) => item.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) {
    return { ok: false, mensagem: 'Já existe um setor com esse nome.' };
  }
  const codigo = new SetorCodigo().gerar(nome, linhas.map((item) => item.codigo));
  const ordem = linhas.reduce((max, item) => Math.max(max, item.ordem), -1) + 1;
  const { error } = await client.from('pessoas_setores' as never).insert({
    codigo,
    nome,
    tipo: entrada.tipo,
    ordem,
    ativo: true,
  } as never);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: 'Setor criado.' };
}

export async function reordenarSetores(codigos: string[]): Promise<SetorResultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  if (codigos.length === 0) return { ok: false, mensagem: 'Informe a ordem dos setores.' };
  const client = supabaseClientFactory.createServiceRoleClient();
  for (let indice = 0; indice < codigos.length; indice += 1) {
    const { error } = await client
      .from('pessoas_setores' as never)
      .update({ ordem: indice, updated_at: new Date().toISOString() } as never)
      .eq('codigo', codigos[indice] as never);
    if (error) return { ok: false, mensagem: error.message };
  }
  return { ok: true, mensagem: 'Ordem atualizada.' };
}
