'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import RealizadoEtapa from '@/components/Realizado/RealizadoEtapa';
import EtapaReabrirConfirmDialog from '@/components/Realizado/etapa/EtapaReabrirConfirmDialog';
import {
  buildFornoLoteLookup,
  buildFornoOrdemLookup,
  buildFornoWorklistData,
  FORNO_ETAPA_CONFIG,
} from '@/domain/producao-etapa/forno-etapa-adapter';
import { buildOrdensEtapaToolbarMetrics } from '@/domain/producao-etapa/build-etapa-toolbar-metrics';
import {
  splitOrdensPorFinalizacao,
  type PainelLoteItemEtapa,
} from '@/domain/realizado/etapa-painel-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import { useEtapaPainelCarga } from '@/hooks/useEtapaPainelCarga';
import { useEtapaReabrirOp } from '@/hooks/useEtapaReabrirOp';
import type { ProducaoData } from '@/domain/types';

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export default function ProducaoFornoPage() {
  const latestDate = useLatestDataDate('forno');
  const [selectedDate, setSelectedDate] = useState(latestDate);
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [isNewLoteModal, setIsNewLoteModal] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<PainelOrdemEtapa | null>(null);
  const [editingLote, setEditingLote] = useState<PainelLoteItemEtapa | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [deletingLoteId, setDeletingLoteId] = useState<string | null>(null);
  const [creatingLoteOrdemId, setCreatingLoteOrdemId] = useState<string | null>(null);

  const {
    ordens,
    loading,
    refreshing,
    message,
    setMessage,
    dashboardItems,
    dashboardPrev,
    dashboardWeek,
    comparisonWeekDate,
    dateComparisonPrev,
    refreshOrdensOnly,
  } = useEtapaPainelCarga({
    etapa: 'forno',
    selectedDate,
    setSelectedDate,
    producaoModalOpen,
  });

  useEffect(() => {
    setSelectedDate(latestDate);
  }, [latestDate]);

  const ordemLookup = useMemo(() => buildFornoOrdemLookup(ordens), [ordens]);
  const loteLookup = useMemo(() => buildFornoLoteLookup(ordens), [ordens]);

  const handleEditProducao = useCallback(
    async (ordem: PainelOrdemEtapa, lote: PainelLoteItemEtapa) => {
      if (!lote.loteId) {
        setMessage('Este lote não pode ser editado');
        return;
      }

      try {
        setLoadingCardId(lote.loteId);
        setProducaoLoading(true);
        const res = await fetch(`/api/producao/forno/lote/${lote.loteId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Falha ao carregar dados de produção');
        }

        const ordemAtual =
          ordens.find((item) => item.ordemProducaoId === data.ordemProducaoId) ?? ordem;

        setSelectedOrdem(ordemAtual);
        setEditingLote({
          ...lote,
          ordemProducaoId: data.ordemProducaoId || lote.ordemProducaoId,
          assadeiras: data.data.assadeiras || 0,
          unidades: data.data.unidades || 0,
          fotoUrl: data.data.fotoUrl,
          fotoId: data.data.fotoId,
          fotoUploadedAt: data.data.fotoUploadedAt,
        });
        setIsNewLoteModal(false);
        setProducaoModalOpen(true);
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao carregar lote de forno'));
      } finally {
        setProducaoLoading(false);
        setLoadingCardId(null);
      }
    },
    [ordens, setMessage],
  );

  const handleNovoLote = useCallback((ordem: PainelOrdemEtapa) => {
    setCreatingLoteOrdemId(ordem.ordemProducaoId);
    setSelectedOrdem(ordem);
    setEditingLote(null);
    setIsNewLoteModal(true);
    setProducaoModalOpen(true);
    setCreatingLoteOrdemId(null);
  }, []);

  const handleDeleteLote = useCallback(
    async (lote: PainelLoteItemEtapa) => {
      if (!lote.loteId) {
        setMessage('Este lote não pode ser excluído');
        return;
      }
      const confirmou = window.confirm('Excluir este lote de forno?');
      if (!confirmou) return;

      setDeletingLoteId(lote.loteId);
      setMessage(null);
      try {
        const res = await fetch(`/api/producao/forno/lote/${lote.loteId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao excluir lote');
        if (data.insumoConsumo?.avisos?.length) {
          setMessage(`Aviso: ${data.insumoConsumo.avisos.join(' ')}`);
          setTimeout(() => setMessage(null), 6000);
        }
        await refreshOrdensOnly();
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao excluir lote'));
      } finally {
        setDeletingLoteId(null);
      }
    },
    [refreshOrdensOnly, setMessage],
  );

  const handleInsumoConsumoAviso = useCallback(
    (avisos: string[]) => {
      setMessage(`Aviso: ${avisos.join(' ')}`);
      setTimeout(() => setMessage(null), 6000);
    },
    [setMessage],
  );

  const handleSaveProducao = useCallback(
    async (
      producaoData: ProducaoData,
      options?: { continuaProduzindo?: boolean },
    ) => {
      if (!editingLote?.loteId) return;

      try {
        setProducaoLoading(true);
        setMessage(null);
        const res = await fetch(`/api/producao/forno/lote/${editingLote.loteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assadeiras: producaoData.caixas,
            unidades: producaoData.unidades,
            fotoUrl: producaoData.fornoFotoUrl,
            fotoId: producaoData.fornoFotoId,
            fotoUploadedAt: producaoData.fornoFotoUploadedAt,
            continuaProduzindo: options?.continuaProduzindo ?? true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');
        if (data.insumoConsumo?.avisos?.length) {
          setMessage(`Aviso: ${data.insumoConsumo.avisos.join(' ')}`);
          setTimeout(() => setMessage(null), 6000);
        } else {
          setMessage('Produção de forno atualizada com sucesso!');
          setTimeout(() => setMessage(null), 3000);
        }
        await refreshOrdensOnly();
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao salvar produção de forno'));
      } finally {
        setProducaoLoading(false);
      }
    },
    [editingLote, refreshOrdensOnly, setMessage],
  );

  const handleNovoLoteById = useCallback(
    (ordemProducaoId: string) => {
      const ordem = ordemLookup.get(ordemProducaoId);
      if (ordem) handleNovoLote(ordem);
    },
    [ordemLookup, handleNovoLote],
  );

  const { reabrindoOpId, handleReabrirOpById, reabrirDialogProps } = useEtapaReabrirOp({
    etapa: 'forno',
    etapaNome: 'forno',
    ordemLookup,
    refreshOrdensOnly,
    onNovoLote: handleNovoLote,
    setMessage,
    getVisibleErrorMessage,
  });

  const handleEditLoteById = useCallback(
    (loteId: string) => {
      const lote = loteLookup.get(loteId);
      const ordem = lote ? ordemLookup.get(lote.ordemProducaoId) : undefined;
      if (lote && ordem) void handleEditProducao(ordem, lote);
    },
    [loteLookup, ordemLookup, handleEditProducao],
  );

  const handleDeleteLoteById = useCallback(
    (loteId: string) => {
      const lote = loteLookup.get(loteId);
      if (lote) void handleDeleteLote(lote);
    },
    [loteLookup, handleDeleteLote],
  );

  const { naoFinalizados, finalizados } = useMemo(
    () => splitOrdensPorFinalizacao(ordens),
    [ordens],
  );

  const toolbarMetrics = useMemo(
    () => buildOrdensEtapaToolbarMetrics(ordens, FORNO_ETAPA_CONFIG.unit.toUpperCase()),
    [ordens],
  );

  const worklist = useMemo(
    () =>
      buildFornoWorklistData({
        naoFinalizados,
        finalizados,
        ordens,
        selectedDate,
        loadingCardId,
        deletingLoteId,
        creatingLoteOrdemId,
        reabrindoOpId,
      }),
    [
      naoFinalizados,
      finalizados,
      ordens,
      selectedDate,
      loadingCardId,
      deletingLoteId,
      creatingLoteOrdemId,
      reabrindoOpId,
    ],
  );

  const totalLotes = useMemo(
    () => ordens.reduce((sum, ordem) => sum + ordem.lotes.length, 0),
    [ordens],
  );

  const onCloseModal = useCallback(() => {
    setProducaoModalOpen(false);
    setIsNewLoteModal(false);
    setSelectedOrdem(null);
    setEditingLote(null);
  }, []);

  const selectedPedidoQuantidades = useMemo(() => {
    if (!selectedOrdem) return undefined;
    return {
      caixas: selectedOrdem.pedido.assadeiras,
      pacotes: 0,
      unidades: selectedOrdem.pedido.unidades,
      kg: 0,
    };
  }, [selectedOrdem]);

  const selectedInitialData = useMemo(() => {
    if (!selectedOrdem) return undefined;
    if (isNewLoteModal) {
      return {
        caixas: 0,
        pacotes: 0,
        unidades: 0,
        kg: 0,
      };
    }

    return {
      caixas: editingLote?.assadeiras || 0,
      pacotes: 0,
      unidades: editingLote?.unidades || 0,
      kg: 0,
      fornoFotoUrl: editingLote?.fotoUrl,
      fornoFotoId: editingLote?.fotoId,
      fornoFotoUploadedAt: editingLote?.fotoUploadedAt,
    };
  }, [selectedOrdem, isNewLoteModal, editingLote]);

  return (
    <>
      <RealizadoEtapa
        config={FORNO_ETAPA_CONFIG}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        toolbar={toolbarMetrics}
        loading={loading}
        refreshing={refreshing}
        message={message}
        worklist={worklist}
        dashboardHoraLatas={{
          items: dashboardItems,
          comparisonPrev: dateComparisonPrev
            ? { date: dateComparisonPrev, items: dashboardPrev }
            : null,
          comparisonWeek: { date: comparisonWeekDate, items: dashboardWeek },
        }}
        footer={{
          grupos: naoFinalizados.length + finalizados.length,
          pedidos: ordens.length,
          produzidoLabel: '',
          metaLabel: '',
          customLine: `${naoFinalizados.length + finalizados.length} ordens • ${totalLotes} lotes`,
        }}
        callbacks={{
          onNovoLote: handleNovoLoteById,
          onReabrirOp: handleReabrirOpById,
          onEditLote: handleEditLoteById,
          onDeleteLote: handleDeleteLoteById,
        }}
      />

      {reabrirDialogProps ? (
        <EtapaReabrirConfirmDialog {...reabrirDialogProps} />
      ) : null}

      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={onCloseModal}
        isNewLote={isNewLoteModal}
        onSave={handleSaveProducao}
        onInsumoConsumoAviso={handleInsumoConsumoAviso}
        onSaveSuccess={async () => {
          await refreshOrdensOnly();
        }}
        initialData={selectedInitialData}
        produto={selectedOrdem?.produto || ''}
        cliente={selectedOrdem?.tipoEstoque || ''}
        loteId={editingLote?.loteId}
        ordemProducaoId={selectedOrdem?.ordemProducaoId}
        pedidoQuantidades={selectedPedidoQuantidades}
        loading={producaoLoading}
        mode="forno"
        modoQuantidade={selectedOrdem?.modoQuantidade || 'assadeiras'}
        metaReferencia={selectedOrdem?.metaReferencia}
        metaPlanejada={selectedOrdem?.metaPlanejada}
        produzidoAtual={selectedOrdem?.produzido || 0}
        etapaUnidade={(selectedOrdem?.unidade || 'lt').toUpperCase()}
      />
    </>
  );
}
