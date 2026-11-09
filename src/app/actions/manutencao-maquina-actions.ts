'use server';

import {
  MaquinaCadastro,
  type MaquinaEntrada,
  type MaquinaLinhaValidada,
} from '@/domain/manutencao/maquina-cadastro';
import { SetorOperacional, type SetorLinha } from '@/domain/manutencao/setor-operacional';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type MaquinaItem = {
  id: string;
  codigo: string;
  nome: string;
  setorId: string;
  setorNome: string;
  observacao: string;
  ativo: boolean;
};

type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type Resultado = { ok: boolean; mensagem: string };
type MaquinaRow = {
  id: string;
  codigo: string;
  nome: string;
  setor_id: string;
  observacao: string | null;
  ativo: boolean;
};

type CodigoLinha = { id: string; codigo: string; setor_id: string };
type CodigoGravado = { id: string; codigo: string; setorId: string };

export async function listarMaquinas(): Promise<{
  maquinas: MaquinaItem[];
  setores: SetorLinha[];
}> {
  await requireInternoModulo('interno_manutencao', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const setores = await lerSetores(client);
  const nomes = new Map(setores.map((setor) => [setor.id, setor.nome]));
  const maquinas = (await lerMaquinas(client)).map((linha) => paraItem(linha, nomes));
  return { maquinas, setores: new SetorOperacional().filtrar(setores) };
}

export async function salvarMaquina(
  entrada: MaquinaEntrada & { id?: string },
): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const codigos = await lerCodigos(client);
  const validacao = new MaquinaCadastro().validar(
    entrada,
    await lerSetores(client),
    codigos,
    entrada.id,
    setorAtual(codigos, entrada.id),
  );
  if (!validacao.ok) return validacao;
  const erro = entrada.id
    ? await atualizarMaquina(client, entrada.id, validacao.linha)
    : await inserirMaquina(client, validacao.linha);
  return erro ? { ok: false, mensagem: erro } : { ok: true, mensagem: 'Máquina salva.' };
}

async function lerSetores(client: Cliente): Promise<SetorLinha[]> {
  const { data, error } = await client
    .from('pessoas_setores' as never)
    .select('id, nome, tipo, ativo')
    .order('nome');
  if (error) throw new Error(error.message);
  return (data ?? []) as SetorLinha[];
}

async function lerMaquinas(client: Cliente): Promise<MaquinaRow[]> {
  const { data, error } = await client
    .from('manutencao_maquinas' as never)
    .select('id, codigo, nome, setor_id, observacao, ativo')
    .order('codigo');
  if (error) throw new Error(error.message);
  return (data ?? []) as MaquinaRow[];
}

async function lerCodigos(client: Cliente): Promise<CodigoGravado[]> {
  const { data, error } = await client
    .from('manutencao_maquinas' as never)
    .select('id, codigo, setor_id');
  if (error) throw new Error(error.message);
  return ((data ?? []) as CodigoLinha[]).map((linha) => ({
    id: linha.id,
    codigo: linha.codigo,
    setorId: linha.setor_id,
  }));
}

function setorAtual(codigos: CodigoGravado[], id?: string): string | undefined {
  if (!id) return undefined;
  return codigos.find((gravado) => gravado.id === id)?.setorId;
}

function paraItem(linha: MaquinaRow, nomes: Map<string, string>): MaquinaItem {
  return {
    id: linha.id,
    codigo: linha.codigo,
    nome: linha.nome,
    setorId: linha.setor_id,
    setorNome: nomes.get(linha.setor_id) ?? '',
    observacao: linha.observacao ?? '',
    ativo: linha.ativo,
  };
}

async function inserirMaquina(
  client: Cliente,
  linha: MaquinaLinhaValidada,
): Promise<string | null> {
  const { error } = await client
    .from('manutencao_maquinas' as never)
    .insert(paraLinha(linha) as never);
  return error ? error.message : null;
}

async function atualizarMaquina(
  client: Cliente,
  id: string,
  linha: MaquinaLinhaValidada,
): Promise<string | null> {
  const { data, error } = await client
    .from('manutencao_maquinas' as never)
    .update({ ...paraLinha(linha), updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .select('id');
  if (error) return error.message;
  if (!data || (data as unknown[]).length === 0) return 'Máquina não encontrada.';
  return null;
}

function paraLinha(linha: MaquinaLinhaValidada) {
  return {
    codigo: linha.codigo,
    nome: linha.nome,
    setor_id: linha.setorId,
    observacao: linha.observacao,
    ativo: linha.ativo,
  };
}
