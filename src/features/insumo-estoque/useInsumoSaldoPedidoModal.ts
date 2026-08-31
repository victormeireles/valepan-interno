'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listarInsumosParaPedido,
  obterPedidoCompra,
} from '@/app/actions/insumo-pedido-compra-actions';
import type { InsumoPedidoCompraListItem } from '@/data/insumos/InsumoPedidoCompraRepository';
import type { InsumoPedidoPipelineResumo } from '@/domain/insumos/insumo-pedido-compra-types';
import type { InsumoPedidoOpcao } from '@/features/insumo-pedido-compra/components/InsumoPedidoCompraFormModal';

export type InsumoSaldoPedidoToastTone = 'success' | 'error';

type Params = {
  pipelinePorInsumo: Record<string, InsumoPedidoPipelineResumo>;
  onToast: (message: string, tone: InsumoSaldoPedidoToastTone) => void;
};

export function useInsumoSaldoPedidoModal({ pipelinePorInsumo, onToast }: Params) {
  const router = useRouter();
  const [pedido, setPedido] = useState<InsumoPedidoCompraListItem | null>(null);
  const [insumoOpcoes, setInsumoOpcoes] = useState<InsumoPedidoOpcao[]>([]);

  const abrirPipeline = (insumoId: string) => {
    void abrirPipelinePedido(
      insumoId,
      pipelinePorInsumo,
      router,
      setPedido,
      setInsumoOpcoes,
      onToast,
    );
  };

  const fechar = () => setPedido(null);

  const handleSaved = (mensagem: string) => {
    setPedido(null);
    onToast(mensagem, 'success');
    router.refresh();
  };

  return { pedido, insumoOpcoes, abrirPipeline, fechar, handleSaved };
}

async function abrirPipelinePedido(
  insumoId: string,
  pipelinePorInsumo: Record<string, InsumoPedidoPipelineResumo>,
  router: ReturnType<typeof useRouter>,
  setPedido: (value: InsumoPedidoCompraListItem | null) => void,
  setInsumoOpcoes: (value: InsumoPedidoOpcao[]) => void,
  onToast: (message: string, tone: InsumoSaldoPedidoToastTone) => void,
) {
  const pedidoIds = pipelinePorInsumo[insumoId]?.pedidoIds ?? [];
  if (pedidoIds.length !== 1) {
    router.push(`/compras-insumos?insumo=${insumoId}&filtro=abertos`);
    return;
  }

  try {
    const [pedido, opcoes] = await Promise.all([
      obterPedidoCompra(pedidoIds[0]!),
      listarInsumosParaPedido(),
    ]);
    if (!pedido) {
      onToast('Pedido não encontrado.', 'error');
      return;
    }
    setInsumoOpcoes(opcoes);
    setPedido(pedido);
  } catch {
    onToast('Erro ao abrir pedido.', 'error');
  }
}
