'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

import { revalidatePath } from 'next/cache';
import {
  categoriaVisibilidadeManager,
  type CategoriaVisibilidadeRow,
} from '@/domain/categorias/categoria-visibilidade-manager';
import { PainelEtapaRevalidator } from '@/lib/painel/revalidate-painel-etapa';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CategoriaVisibilidadeConfig = CategoriaVisibilidadeRow;

export async function getCategoriasVisibilidadeEmbalagem(): Promise<
  CategoriaVisibilidadeConfig[]
> {
  await requireInternoModulo('interno_config', 'ler');
  return categoriaVisibilidadeManager.listCategoriasAtivasComVisibilidade();
}

export async function updateCategoriaVisivelEmbalagem(
  categoriaId: string,
  visivel: boolean,
): Promise<ActionResult> {
  await requireInternoModulo('interno_config', 'administrar');
  try {
    await categoriaVisibilidadeManager.updateVisivelEmbalagem(categoriaId, visivel);
    revalidatePath('/realizado/embalagem');
    PainelEtapaRevalidator.run('embalagem');
    revalidatePath('/config/categorias');
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao salvar',
    };
  }
}
