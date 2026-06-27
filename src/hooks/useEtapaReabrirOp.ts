'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  etapaReabrirAcaoPolicy,
  type EtapaReabrirAcao,
} from '@/domain/producao-etapa/etapa-reabrir-acao';
import { buildEtapaReabrirMensagem } from '@/domain/producao-etapa/build-etapa-reabrir-mensagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

type EtapaReabrirSlug = 'fermentacao' | 'forno';

type UseEtapaReabrirOpOptions = {
  etapa: EtapaReabrirSlug;
  etapaNome: string;
  ordemLookup: Map<string, PainelOrdemEtapa>;
  refreshOrdensOnly: () => Promise<PainelOrdemEtapa[]>;
  onNovoLote: (ordem: PainelOrdemEtapa) => void;
  setMessage: (message: string | null) => void;
  getVisibleErrorMessage: (error: unknown, fallback: string) => string | null;
};

export function useEtapaReabrirOp({
  etapa,
  etapaNome,
  ordemLookup,
  refreshOrdensOnly,
  onNovoLote,
  setMessage,
  getVisibleErrorMessage,
}: UseEtapaReabrirOpOptions) {
  const [reabrindoOpId, setReabrindoOpId] = useState<string | null>(null);
  const [reabrirDialogOrdemId, setReabrirDialogOrdemId] = useState<string | null>(null);

  const ordemReabrirDialog = useMemo(() => {
    if (!reabrirDialogOrdemId) return null;
    return ordemLookup.get(reabrirDialogOrdemId) ?? null;
  }, [reabrirDialogOrdemId, ordemLookup]);

  const handleReabrirOpById = useCallback(
    (ordemProducaoId: string) => {
      setReabrirDialogOrdemId(ordemProducaoId);
      setMessage(null);
    },
    [setMessage],
  );

  const handleConfirmReabrirOp = useCallback(async (acao: EtapaReabrirAcao) => {
    if (!reabrirDialogOrdemId) return;

    const ordem = ordemLookup.get(reabrirDialogOrdemId);
    if (!ordem) {
      setMessage('Ordem não encontrada');
      setReabrirDialogOrdemId(null);
      return;
    }

    setReabrindoOpId(reabrirDialogOrdemId);
    try {
      const res = await fetch(`/api/producao/${etapa}/ordem/${reabrirDialogOrdemId}/reabrir`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Falha ao reabrir ${etapaNome}`);

      setReabrirDialogOrdemId(null);
      const ordensAtualizadas = await refreshOrdensOnly();
      const ordemAtualizada =
        ordensAtualizadas.find((item) => item.ordemProducaoId === reabrirDialogOrdemId) ?? ordem;
      if (etapaReabrirAcaoPolicy.shouldOpenNovoLote(acao)) {
        onNovoLote(ordemAtualizada);
      }
    } catch (error) {
      setMessage(getVisibleErrorMessage(error, `Erro ao reabrir ${etapaNome}`));
    } finally {
      setReabrindoOpId(null);
    }
  }, [
    reabrirDialogOrdemId,
    ordemLookup,
    etapa,
    etapaNome,
    refreshOrdensOnly,
    onNovoLote,
    setMessage,
    getVisibleErrorMessage,
  ]);

  const reabrirDialogProps = useMemo(() => {
    if (!ordemReabrirDialog) return null;

    return {
      open: true,
      titulo: `Reabrir ${etapaNome}?`,
      mensagem: buildEtapaReabrirMensagem({
        etapaNome,
        produzidoLabel: String(ordemReabrirDialog.produzido),
        unidade: ordemReabrirDialog.unidade,
      }),
      textoConfirmar: 'Reabrir',
      textoConfirmarComLote: 'Reabrir e adicionar lote',
      loading: reabrindoOpId !== null,
      onCancelar: () => setReabrirDialogOrdemId(null),
      onConfirmar: () => void handleConfirmReabrirOp('somente-reabrir'),
      onConfirmarComLote: () => void handleConfirmReabrirOp('reabrir-e-adicionar-lote'),
    };
  }, [
    ordemReabrirDialog,
    etapaNome,
    reabrindoOpId,
    handleConfirmReabrirOp,
  ]);

  return {
    reabrindoOpId,
    handleReabrirOpById,
    reabrirDialogProps,
  };
}
