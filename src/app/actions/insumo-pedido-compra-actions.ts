'use server';

import { revalidatePath } from 'next/cache';

import type { InsumoPedidoCompraFiltro } from '@/data/insumos/InsumoPedidoCompraRepository';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { sessionUsuarioIdResolver } from '@/lib/auth/session-usuario-id-resolver';
import {
  insumoPedidoCompraManager,
  type SalvarInsumoPedidoCompraInput,
} from '@/lib/services/insumo-pedido-compra-manager';

const REVALIDATE_PATHS = [
  '/compras-insumos',
  '/sugestao-compras',
  '/estoque-insumos',
] as const;

function revalidatePedidoPages() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function listarPedidosCompra(
  filtro: InsumoPedidoCompraFiltro,
  insumoId?: string,
) {
  await requireInternoModulo('interno_insumos', 'ler');
  return insumoPedidoCompraManager.listar(filtro, insumoId);
}

export async function obterPedidoCompra(id: string) {
  await requireInternoModulo('interno_insumos', 'ler');
  return insumoPedidoCompraManager.obter(id);
}

export async function salvarPedidoCompra(input: SalvarInsumoPedidoCompraInput) {
  await requireInternoModulo('interno_insumos', 'editar');
  const criadoPor = input.id
    ? input.criadoPor
    : await sessionUsuarioIdResolver.resolve();
  const pedido = await insumoPedidoCompraManager.salvar({
    ...input,
    criadoPor,
  });
  revalidatePedidoPages();
  return pedido;
}

export async function encerrarPedidoCompra(id: string) {
  await requireInternoModulo('interno_insumos', 'editar');
  await insumoPedidoCompraManager.encerrar(id);
  revalidatePedidoPages();
}

export async function cancelarPedidoCompra(id: string) {
  await requireInternoModulo('interno_insumos', 'editar');
  await insumoPedidoCompraManager.cancelar(id);
  revalidatePedidoPages();
}

export async function listarInsumosParaPedido() {
  await requireInternoModulo('interno_insumos', 'ler');
  return insumoPedidoCompraManager.listarOpcoesInsumo();
}
