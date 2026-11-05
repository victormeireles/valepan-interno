'use server';

import { ColaboradorCadastroNormalizador, type ColaboradorCadastro } from '@/domain/pessoas/colaborador-cadastro';
import { ColaboradorCadastroRowParser } from '@/domain/pessoas/colaborador-cadastro-row-parser';
import type { Regime } from '@/domain/pessoas/regime-cadastro';
import { RegimeTroca } from '@/domain/pessoas/regime-troca';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const SELECT_CADASTRO =
  'telefone, email, nome_mae, cpf, endereco, vale_transporte, contato_emergencia, telefone_emergencia, tamanho_camiseta, tamanho_calca, numero_calcado, banco, agencia, conta_corrente, conta_poupanca, chave_pix, data_admissao, nascimento, regime, cnpj, razao_social, indicacao';

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
  let nome: string | null = null;
  let dataAdmissao: string | null | undefined;
  let nascimento: string | null | undefined;
  try {
    cadastro = normalizador.normalizar(campos);
    if ('nome' in campos) nome = normalizador.nomeColaborador(campos.nome);
    if ('dataAdmissao' in campos) dataAdmissao = cadastro.dataAdmissao;
    if ('nascimento' in campos) nascimento = cadastro.nascimento;
  } catch (error) {
    return { ok: false, mensagem: error instanceof Error ? error.message : 'Não foi possível salvar.' };
  }
  const client = supabaseClientFactory.createServiceRoleClient();
  try {
    await validarTrocaDeRegime(client, codigo, cadastro.regime);
  } catch (error) {
    return { ok: false, mensagem: error instanceof Error ? error.message : 'Não foi possível salvar.' };
  }
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .update({
      ...paraLinha(cadastro, normalizador),
      ...(nome ? { nome } : {}),
      ...(dataAdmissao !== undefined ? { data_admissao: dataAdmissao } : {}),
      ...(nascimento !== undefined ? { nascimento } : {}),
    } as never)
    .eq('codigo', codigo)
    .select('codigo');
  if (error) return { ok: false, mensagem: error.message };
  if (!data || (data as unknown[]).length === 0) return { ok: false, mensagem: 'Colaborador não encontrado.' };
  return { ok: true, mensagem: 'Cadastro atualizado.' };
}

type ClienteServico = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;

async function validarTrocaDeRegime(client: ClienteServico, codigo: string, destino: Regime): Promise<void> {
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select('id, regime, situacao, data_desligamento')
    .eq('codigo', codigo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Colaborador não encontrado.');
  const atual = data as { id: string; regime: Regime | null; situacao: string; data_desligamento: string | null };
  if ((atual.regime ?? 'clt') === destino) return;
  const avisos = await client
    .from('pessoas_avisos' as never)
    .select('id', { count: 'exact', head: true })
    .eq('colaborador_id', atual.id)
    .eq('situacao', 'ativo');
  if (avisos.error) throw new Error(avisos.error.message);
  new RegimeTroca().avaliar(destino, (avisos.count ?? 0) > 0, atual.situacao, atual.data_desligamento);
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
    regime: cadastro.regime,
    cnpj: cadastro.cnpj,
    razao_social: cadastro.razaoSocial,
    indicacao: cadastro.indicacao,
    updated_at: new Date().toISOString(),
  };
}
