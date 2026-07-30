'use server';

import { revalidatePath } from 'next/cache';
import { insumoFornecedorIgnoradoRepository } from '@/data/insumos/InsumoFornecedorIgnoradoRepository';
import { insumoFornecedorIgnoradoManager } from '@/lib/services/insumo-fornecedor-ignorado-manager';

const REVALIDATE = ['/mapeamento-insumos', '/config/fornecedores-insumos', '/estoque-insumos'] as const;

function revalidate() {
  for (const path of REVALIDATE) revalidatePath(path);
}

export async function listarFornecedoresIgnorados() {
  return insumoFornecedorIgnoradoRepository.listAll();
}

export async function marcarFornecedorIgnorado(input: {
  empresaId: string;
  cnpj: string;
  nome?: string | null;
  razao?: string | null;
}) {
  try {
    const result = await insumoFornecedorIgnoradoManager.marcarFornecedor(input);
    revalidate();
    return { success: true as const, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao marcar fornecedor';
    return { success: false as const, error: message };
  }
}

export async function desmarcarFornecedorIgnorado(input: {
  empresaId: string;
  cnpj: string;
  restaurarPendencias: boolean;
}) {
  try {
    const result = await insumoFornecedorIgnoradoManager.desmarcarFornecedor(input);
    revalidate();
    return { success: true as const, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao desmarcar fornecedor';
    return { success: false as const, error: message };
  }
}
