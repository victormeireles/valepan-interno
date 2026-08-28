'use server';

import { revalidatePath } from 'next/cache';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { CATEGORIA_EM_USO_MESSAGE } from '@/domain/reclamacoes/reclamacao-categoria-exclusao';
import type { ReclamacaoCategoriaRecord } from '@/domain/reclamacoes/reclamacao-types';
import {
  reclamacaoCategoriaService,
  type ReclamacaoCategoriaWriteInput,
} from '@/lib/services/reclamacao-categoria-service';

const CONFIG_PATH = '/config/categorias-reclamacao';
const EMPTY_NAME_MESSAGE = 'Informe o nome.';
const UNIQUE_NAME_MESSAGE = 'Já existe uma categoria ativa com esse nome.';

type ActionResult<T = ReclamacaoCategoriaRecord> =
  | { success: true; data: T }
  | { success: false; error: string };

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const withCode = error as Error & { code?: string };
  if (withCode.code === '23505') return true;
  return /duplicate key|unique constraint|23505/i.test(error.message);
}

function mapWriteError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.message === CATEGORIA_EM_USO_MESSAGE) {
      return CATEGORIA_EM_USO_MESSAGE;
    }
    if (isUniqueViolation(error)) {
      return UNIQUE_NAME_MESSAGE;
    }
  }
  console.error(fallback, error);
  return fallback;
}

function parseWriteInput(input: ReclamacaoCategoriaWriteInput): ActionResult<ReclamacaoCategoriaWriteInput> {
  const nome = input.nome.trim();
  if (!nome) {
    return { success: false, error: EMPTY_NAME_MESSAGE };
  }
  return {
    success: true,
    data: {
      nome,
      ordem: Number.isFinite(input.ordem) ? input.ordem : 0,
      ativa: input.ativa,
      exigeObservacao: input.exigeObservacao,
    },
  };
}

function revalidateCategoriaPaths(): void {
  revalidatePath(CONFIG_PATH);
}

export async function listReclamacaoCategorias(
  includeInactive = true,
): Promise<ReclamacaoCategoriaRecord[]> {
  await requireInternoModulo('interno_config', 'ler');
  if (includeInactive) {
    return reclamacaoCategoriaService.listAll();
  }
  return reclamacaoCategoriaService.listAtivas();
}

export async function createReclamacaoCategoria(
  input: ReclamacaoCategoriaWriteInput,
): Promise<ActionResult> {
  await requireInternoModulo('interno_config', 'administrar');
  const parsed = parseWriteInput(input);
  if (!parsed.success) return parsed;

  try {
    const data = await reclamacaoCategoriaService.create(parsed.data);
    revalidateCategoriaPaths();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: mapWriteError(error, 'Erro ao criar categoria'),
    };
  }
}

export async function updateReclamacaoCategoria(
  id: string,
  input: ReclamacaoCategoriaWriteInput,
): Promise<ActionResult> {
  await requireInternoModulo('interno_config', 'administrar');
  const parsed = parseWriteInput(input);
  if (!parsed.success) return parsed;

  try {
    const data = await reclamacaoCategoriaService.update(id, parsed.data);
    revalidateCategoriaPaths();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: mapWriteError(error, 'Erro ao atualizar categoria'),
    };
  }
}

export async function deleteReclamacaoCategoria(
  id: string,
): Promise<ActionResult<null>> {
  await requireInternoModulo('interno_config', 'administrar');

  try {
    await reclamacaoCategoriaService.remove(id);
    revalidateCategoriaPaths();
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: mapWriteError(error, 'Erro ao excluir categoria'),
    };
  }
}
