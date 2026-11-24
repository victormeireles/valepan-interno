'use server';

import { revalidatePath } from 'next/cache';
import { CargoFaixaLeitura, CargoFaixaNormalizador, type CargoCadastro, type CargoFaixaEntrada } from '@/domain/pessoas/cargo-faixa';
import { CargoNomeUnico } from '@/domain/pessoas/cargo-nome';
import { CargoOpcaoLeitura, type CargoOpcao } from '@/domain/pessoas/cargo-opcao';
import { CargoExclusao } from '@/domain/pessoas/cargo-vinculo';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const SELECT_CARGO = 'id, nome, de_centavos, ate_centavos, ativo';
const EM_USO = 'Este cargo está em uso. Desative para tirá-lo das novas escolhas.';

export type CargoForm = { id?: string; nome: string; de: string; ate: string };
export type CargoResultado = { ok: boolean; mensagem: string };

export async function listarCargos(): Promise<CargoCadastro[]> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  return lerCargos();
}

export async function listarOpcoesCargo(): Promise<CargoOpcao[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const { data, error } = await supabaseClientFactory
    .createServiceRoleClient()
    .from('pessoas_cargos' as never)
    .select('id, nome')
    .eq('ativo', true)
    .order('nome');
  if (error) throw new Error(error.message);
  return new CargoOpcaoLeitura().parseAll(data);
}

export async function gravarCargo(form: CargoForm): Promise<CargoResultado> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  try {
    const entrada = new CargoFaixaNormalizador().normalizar(form);
    if (new CargoNomeUnico().repetido(await lerCargos(), entrada.nome, form.id)) {
      return { ok: false, mensagem: 'Já existe um cargo com esse nome.' };
    }
    await persistir(form.id, entrada);
    revalidar();
    return { ok: true, mensagem: 'Cargo gravado.' };
  } catch (error) {
    return { ok: false, mensagem: mensagemDe(error) };
  }
}

export async function definirCargoAtivo(id: string, ativo: boolean): Promise<CargoResultado> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  const { data, error } = await supabaseClientFactory
    .createServiceRoleClient()
    .from('pessoas_cargos' as never)
    .update({ ativo, updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, mensagem: error.message };
  if (!data || (data as unknown[]).length === 0) return { ok: false, mensagem: 'Cargo não encontrado.' };
  revalidar();
  return { ok: true, mensagem: ativo ? 'Cargo reativado.' : 'Cargo desativado.' };
}

export async function apagarCargo(id: string): Promise<CargoResultado> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  try {
    const aviso = new CargoExclusao().mensagemSeUsado(await contarUso(id));
    if (aviso) return { ok: false, mensagem: aviso };
    return await remover(id);
  } catch (error) {
    return { ok: false, mensagem: mensagemDe(error) };
  }
}

async function lerCargos(): Promise<CargoCadastro[]> {
  const { data, error } = await supabaseClientFactory
    .createServiceRoleClient()
    .from('pessoas_cargos' as never)
    .select(SELECT_CARGO)
    .order('nome');
  if (error) throw new Error(error.message);
  return new CargoFaixaLeitura().parseAll(data);
}

async function persistir(id: string | undefined, entrada: CargoFaixaEntrada): Promise<void> {
  const client = supabaseClientFactory.createServiceRoleClient();
  const linha = {
    nome: entrada.nome,
    de_centavos: entrada.deCentavos,
    ate_centavos: entrada.ateCentavos,
    updated_at: new Date().toISOString(),
  };
  const resultado = id
    ? await client.from('pessoas_cargos' as never).update(linha as never).eq('id', id)
    : await client.from('pessoas_cargos' as never).insert(linha as never);
  if (resultado.error?.code === '23505') throw new Error('Já existe um cargo com esse nome.');
  if (resultado.error) throw new Error(resultado.error.message);
}

async function contarUso(id: string): Promise<number> {
  const { count, error } = await supabaseClientFactory
    .createServiceRoleClient()
    .from('pessoas_colaboradores' as never)
    .select('id', { count: 'exact', head: true })
    .eq('cargo_id', id);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function remover(id: string): Promise<CargoResultado> {
  const { error } = await supabaseClientFactory
    .createServiceRoleClient()
    .from('pessoas_cargos' as never)
    .delete()
    .eq('id', id);
  if (error?.code === '23503') return { ok: false, mensagem: EM_USO };
  if (error) return { ok: false, mensagem: error.message };
  revalidar();
  return { ok: true, mensagem: 'Cargo apagado.' };
}

function revalidar(): void {
  revalidatePath('/pessoas/cargos');
  revalidatePath('/pessoas');
}

function mensagemDe(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível gravar o cargo.';
}
