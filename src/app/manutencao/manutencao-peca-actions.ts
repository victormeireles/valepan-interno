'use server';

import {
  PecaCadastro,
  type PecaEntrada,
  type PecaLinhaValidada,
} from '@/domain/manutencao/peca-cadastro';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type Resultado = { ok: boolean; mensagem: string };
type CodigoGravado = { id: string; codigo: string };
type ErroGravacao = { code?: string; message: string } | null;

const CODIGO_REPETIDO = 'Já existe uma peça com esse código.';

export async function salvarPeca(
  entrada: PecaEntrada & { id?: string },
): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const validacao = new PecaCadastro().validar(
    entrada,
    await lerCodigos(client),
    entrada.id,
  );
  if (!validacao.ok) return validacao;
  const erro = entrada.id
    ? await atualizarPeca(client, entrada.id, validacao.linha)
    : await inserirPeca(client, validacao.linha);
  return erro ? { ok: false, mensagem: erro } : { ok: true, mensagem: 'Peça salva.' };
}

async function lerCodigos(client: Cliente): Promise<CodigoGravado[]> {
  const { data, error } = await client
    .from('manutencao_pecas' as never)
    .select('id, codigo');
  if (error) throw new Error(error.message);
  return (data ?? []) as CodigoGravado[];
}

async function inserirPeca(
  client: Cliente,
  linha: PecaLinhaValidada,
): Promise<string | null> {
  const { error } = await client
    .from('manutencao_pecas' as never)
    .insert(paraLinha(linha) as never);
  return mensagemGravacao(error);
}

async function atualizarPeca(
  client: Cliente,
  id: string,
  linha: PecaLinhaValidada,
): Promise<string | null> {
  const { data, error } = await client
    .from('manutencao_pecas' as never)
    .update({ ...paraLinha(linha), updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .select('id');
  if (error) return mensagemGravacao(error);
  if (!data || (data as unknown[]).length === 0) return 'Peça não encontrada.';
  return null;
}

function paraLinha(linha: PecaLinhaValidada) {
  return {
    codigo: linha.codigo,
    nome: linha.nome,
    unidade: linha.unidade,
    ativo: linha.ativo,
  };
}

function mensagemGravacao(error: ErroGravacao): string | null {
  if (!error) return null;
  if (error.code === '23505') return CODIGO_REPETIDO;
  return error.message;
}
