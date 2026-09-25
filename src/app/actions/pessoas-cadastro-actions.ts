'use server';

import { ColaboradorCadastroNormalizador, type ColaboradorCadastro } from '@/domain/pessoas/colaborador-cadastro';
import { ColaboradorCadastroRowParser } from '@/domain/pessoas/colaborador-cadastro-row-parser';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const SELECT_CADASTRO =
  'telefone, email, nome_mae, cpf, endereco, vale_transporte, contato_emergencia, telefone_emergencia, tamanho_camiseta, tamanho_calca, numero_calcado, banco, agencia, conta_corrente, conta_poupanca, chave_pix';

export async function obterCadastroColaborador(codigo: string): Promise<ColaboradorCadastro> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select(SELECT_CADASTRO)
    .eq('codigo', codigo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Colaborador não encontrado.');
  return new ColaboradorCadastroRowParser().parse(data);
}

export async function atualizarCadastroColaborador(
  codigo: string,
  campos: Record<string, string>,
): Promise<{ ok: boolean; mensagem: string }> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const normalizador = new ColaboradorCadastroNormalizador();
  let cadastro: ColaboradorCadastro;
  try {
    cadastro = normalizador.normalizar(campos);
  } catch (error) {
    return { ok: false, mensagem: error instanceof Error ? error.message : 'Não foi possível salvar.' };
  }
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .update(paraLinha(cadastro, normalizador) as never)
    .eq('codigo', codigo)
    .select('codigo');
  if (error) return { ok: false, mensagem: error.message };
  if (!data || (data as unknown[]).length === 0) return { ok: false, mensagem: 'Colaborador não encontrado.' };
  return { ok: true, mensagem: 'Cadastro atualizado.' };
}

function paraLinha(cadastro: ColaboradorCadastro, normalizador: ColaboradorCadastroNormalizador) {
  return {
    telefone: cadastro.telefone,
    email: cadastro.email,
    nome_mae: cadastro.nomeMae,
    cpf: cadastro.cpf,
    cpf_verificado: normalizador.cpfConferido(cadastro.cpf),
    endereco: cadastro.endereco,
    vale_transporte: cadastro.valeTransporte,
    contato_emergencia: cadastro.contatoEmergencia,
    telefone_emergencia: cadastro.telefoneEmergencia,
    tamanho_camiseta: cadastro.tamanhoCamiseta,
    tamanho_calca: cadastro.tamanhoCalca,
    numero_calcado: cadastro.numeroCalcado,
    banco: cadastro.banco,
    agencia: cadastro.agencia,
    conta_corrente: cadastro.contaCorrente,
    conta_poupanca: cadastro.contaPoupanca,
    chave_pix: cadastro.chavePix,
    updated_at: new Date().toISOString(),
  };
}
