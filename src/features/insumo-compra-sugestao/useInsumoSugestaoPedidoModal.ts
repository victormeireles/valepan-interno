'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { obterPedidoCompra } from '@/app/actions/insumo-pedido-compra-actions';
import type { InsumoPedidoCompraListItem } from '@/data/insumos/InsumoPedidoCompraRepository';
import type { InsumoPedidoCompraFormPrefill } from '@/features/insumo-pedido-compra/components/InsumoPedidoCompraFormModal';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';
import { buildSugestaoPedidoPrefill } from './insumo-compra-sugestao-pedido-prefill';

export type InsumoSugestaoPedidoTarget =
  | { mode: 'create'; prefill: InsumoPedidoCompraFormPrefill }
  | { mode: 'edit'; pedido: InsumoPedidoCompraListItem };

type ToastTone = 'success' | 'error';

type Params = {
  dataReferencia: string;
  onToast: (message: string, tone: ToastTone) => void;
};

export function useInsumoSugestaoPedidoModal({ dataReferencia, onToast }: Params) {
  const router = useRouter();
  const [target, setTarget] = useState<InsumoSugestaoPedidoTarget | null>(null);

  const registrarPedido = (item: InsumoCompraSugestaoLinha) => {
    setTarget({
      mode: 'create',
      prefill: buildSugestaoPedidoPrefill(item, dataReferencia),
    });
  };

  const abrirPipeline = (item: InsumoCompraSugestaoLinha) => {
    void abrirPipelinePedido(item, router, setTarget, onToast);
  };

  const fechar = () => setTarget(null);

  const handleSaved = (mensagem: string) => {
    setTarget(null);
    onToast(mensagem, 'success');
    router.refresh();
  };

  return { target, registrarPedido, abrirPipeline, fechar, handleSaved };
}

async function abrirPipelinePedido(
  item: InsumoCompraSugestaoLinha,
  router: ReturnType<typeof useRouter>,
  setTarget: (value: InsumoSugestaoPedidoTarget | null) => void,
  onToast: (message: string, tone: ToastTone) => void,
) {
  const pedidoIds = item.pipeline?.pedidoIds ?? [];
  if (pedidoIds.length !== 1) {
    router.push(`/compras-insumos?insumo=${item.insumoId}&filtro=abertos`);
    return;
  }
  try {
    const pedido = await obterPedidoCompra(pedidoIds[0]!);
    if (!pedido) {
      onToast('Pedido não encontrado.', 'error');
      return;
    }
    setTarget({ mode: 'edit', pedido });
  } catch {
    onToast('Erro ao abrir pedido.', 'error');
  }
}
