'use server';

import { revalidatePath } from 'next/cache';
import {
  categoriaVisibilidadeManager,
  type CategoriaVisibilidadeRow,
} from '@/domain/categorias/categoria-visibilidade-manager';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CategoriaVisibilidadeConfig = CategoriaVisibilidadeRow;

export async function getCategoriasVisibilidadeEmbalagem(): Promise<
  CategoriaVisibilidadeConfig[]
> {
  return categoriaVisibilidadeManager.listCategoriasAtivasComVisibilidade();
}

export async function updateCategoriaVisivelEmbalagem(
  categoriaId: string,
  visivel: boolean,
): Promise<ActionResult> {
  try {
    await categoriaVisibilidadeManager.updateVisivelEmbalagem(categoriaId, visivel);
    revalidatePath('/realizado/embalagem');
    revalidatePath('/api/painel/embalagem');
    revalidatePath('/api/painel/embalagem/carga');
    revalidatePath('/config/categorias');
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao salvar',
    };
  }
}
