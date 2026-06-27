'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  etapaReabrirAcaoPolicy,
  type EtapaReabrirAcao,
} from '@/domain/producao-etapa/etapa-reabrir-acao';
import { buildEtapaReabrirMensagem } from '@/domain/producao-etapa/build-etapa-reabrir-mensagem';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';

type UseEmbalagemReabrirOpOptions = {
  pedidoLookup: Map<string, PainelPedidoEmbalagem>;
  refreshPedidosOnly: () => Promise<PainelPedidoEmbalagem[]>;
  onNovoLote: (pedido: PainelPedidoEmbalagem) => void;
  setMessage: (message: string | null) => void;
  getVisibleErrorMessage: (error: unknown, fallback: string) => string | null;
};

export function useEmbalagemReabrirOp({
  pedidoLookup,
  refreshPedidosOnly,
  onNovoLote,
  setMessage,
  getVisibleErrorMessage,
}: UseEmbalagemReabrirOpOptions) {
  const [reabrindoOpId, setReabrindoOpId] = useState<string | null>(null);
  const [reabrirDialogPedidoId, setReabrirDialogPedidoId] = useState<string | null>(null);

  const pedidoReabrirDialog = useMemo(() => {
    if (!reabrirDialogPedidoId) return null;
    return pedidoLookup.get(reabrirDialogPedidoId) ?? null;
  }, [reabrirDialogPedidoId, pedidoLookup]);

  const handleReabrirOpById = useCallback((pedidoEmbalagemId: string) => {
    setReabrirDialogPedidoId(pedidoEmbalagemId);
    setMessage(null);
  }, [setMessage]);

  const handleConfirmReabrirOp = useCallback(async (acao: EtapaReabrirAcao) => {
    if (!reabrirDialogPedidoId) return;

    const pedido = pedidoLookup.get(reabrirDialogPedidoId);
    if (!pedido) {
      setMessage('Pedido não encontrado');
      setReabrirDialogPedidoId(null);
      return;
    }

    setReabrindoOpId(reabrirDialogPedidoId);
    try {
      const res = await fetch(
        `/api/producao/embalagem/pedido/${reabrirDialogPedidoId}/reabrir`,
        { method: 'POST' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao reabrir embalagem');

      setReabrirDialogPedidoId(null);
      const pedidosAtualizados = await refreshPedidosOnly();
      const pedidoAtualizado =
        pedidosAtualizados.find((p) => p.pedidoEmbalagemId === reabrirDialogPedidoId) ?? pedido;
      if (etapaReabrirAcaoPolicy.shouldOpenNovoLote(acao)) {
        onNovoLote(pedidoAtualizado);
      }
    } catch (err) {
      setMessage(getVisibleErrorMessage(err, 'Erro ao reabrir embalagem'));
    } finally {
      setReabrindoOpId(null);
    }
  }, [
    reabrirDialogPedidoId,
    pedidoLookup,
    refreshPedidosOnly,
    onNovoLote,
    setMessage,
    getVisibleErrorMessage,
  ]);

  const reabrirDialogProps = useMemo(() => {
    if (!pedidoReabrirDialog) return null;

    return {
      open: true,
      titulo: 'Reabrir embalagem?',
      mensagem: buildEtapaReabrirMensagem({
        etapaNome: 'embalagem',
        produzidoLabel: String(pedidoReabrirDialog.produzidoScalar),
        unidade: pedidoReabrirDialog.unidade,
      }),
      textoConfirmar: 'Reabrir',
      textoConfirmarComLote: 'Reabrir e adicionar lote',
      loading: reabrindoOpId !== null,
      onCancelar: () => setReabrirDialogPedidoId(null),
      onConfirmar: () => void handleConfirmReabrirOp('somente-reabrir'),
      onConfirmarComLote: () => void handleConfirmReabrirOp('reabrir-e-adicionar-lote'),
    };
  }, [pedidoReabrirDialog, reabrindoOpId, handleConfirmReabrirOp]);

  return {
    reabrindoOpId,
    handleReabrirOpById,
    reabrirDialogProps,
  };
}
