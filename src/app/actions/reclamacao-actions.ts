'use server';

import { revalidatePath } from 'next/cache';
import { sessionUsuarioIdResolver } from '@/lib/auth/session-usuario-id-resolver';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { clientesService } from '@/lib/services/clientes-service';
import { reclamacaoCategoriaService } from '@/lib/services/reclamacao-categoria-service';
import { reclamacaoService } from '@/lib/services/reclamacao-service';
import { ERRO_SALVAR_RECLAMACAO } from '@/domain/reclamacoes/reclamacao-mensagens';
import type { ReclamacaoWritePayload } from '@/domain/reclamacoes/reclamacao-input';
import type {
  ReclamacaoCategoriaRecord,
  ReclamacaoListFiltro,
  ReclamacaoListItem,
  ReclamacaoOpcao,
} from '@/domain/reclamacoes/reclamacao-types';

const CADERNO_PATH = '/reclamacoes';

export type ReclamacaoActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ReclamacaoFormOpcoes = {
  clientes: ReclamacaoOpcao[];
  produtos: ReclamacaoOpcao[];
  categorias: ReclamacaoCategoriaRecord[];
};

function revalidateCaderno(): void {
  revalidatePath(CADERNO_PATH);
}

function mapError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

async function listProdutosAtivos(): Promise<ReclamacaoOpcao[]> {
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('produtos')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar produtos: ${error.message}`);
  }

  return (data ?? []).map((row) => ({ id: row.id, nome: row.nome }));
}

export async function listReclamacoes(
  filtro: ReclamacaoListFiltro,
): Promise<ReclamacaoListItem[]> {
  await requireInternoModulo('interno_reclamacoes', 'ler');
  return reclamacaoService.list(filtro);
}

export async function listReclamacaoFormOpcoes(): Promise<ReclamacaoFormOpcoes> {
  await requireInternoModulo('interno_reclamacoes', 'ler');
  const [clientes, produtos, categorias] = await Promise.all([
    clientesService.listActiveOptions(),
    listProdutosAtivos(),
    reclamacaoCategoriaService.listAtivas(),
  ]);
  return { clientes, produtos, categorias };
}

export async function createReclamacao(
  input: ReclamacaoWritePayload,
): Promise<ReclamacaoActionResult<ReclamacaoListItem>> {
  await requireInternoModulo('interno_reclamacoes', 'editar');
  try {
    const criadoPor = await sessionUsuarioIdResolver.resolve();
    const data = await reclamacaoService.create({ ...input, criadoPor });
    revalidateCaderno();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: mapError(error, ERRO_SALVAR_RECLAMACAO) };
  }
}

export async function updateReclamacao(
  id: string,
  input: ReclamacaoWritePayload & { fotoIdsRemovidos?: string[] },
): Promise<ReclamacaoActionResult<ReclamacaoListItem>> {
  await requireInternoModulo('interno_reclamacoes', 'editar');
  try {
    const data = await reclamacaoService.update(id, input);
    revalidateCaderno();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: mapError(error, ERRO_SALVAR_RECLAMACAO) };
  }
}

export async function deleteReclamacao(
  id: string,
): Promise<ReclamacaoActionResult<null>> {
  await requireInternoModulo('interno_reclamacoes', 'editar');
  try {
    await reclamacaoService.remove(id);
    revalidateCaderno();
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: mapError(error, ERRO_SALVAR_RECLAMACAO) };
  }
}
