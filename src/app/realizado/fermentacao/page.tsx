'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import RealizadoEtapa from '@/components/Realizado/RealizadoEtapa';
import {
  buildFermentacaoLoteLookup,
  buildFermentacaoOrdemLookup,
  buildFermentacaoWorklistData,
  FERMENTACAO_ETAPA_CONFIG,
} from '@/domain/producao-etapa/fermentacao-etapa-adapter';
import {
  splitOrdensPorFinalizacao,
  type PainelLoteItemEtapa,
} from '@/domain/realizado/etapa-painel-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import { useEtapaPainelCarga } from '@/hooks/useEtapaPainelCarga';
import type { ProducaoData } from '@/domain/types';

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export default function ProducaoFermentacaoPage() {
  const latestDate = useLatestDataDate('fermentacao');
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
    etapa: 'fermentacao',
    selectedDate,
    setSelectedDate,
    producaoModalOpen,
  });

  useEffect(() => {
    setSelectedDate(latestDate);
  }, [latestDate]);

  const ordemLookup = useMemo(() => buildFermentacaoOrdemLookup(ordens), [ordens]);
  const loteLookup = useMemo(() => buildFermentacaoLoteLookup(ordens), [ordens]);

  const handleEditProducao = useCallback(
    async (ordem: PainelOrdemEtapa, lote: PainelLoteItemEtapa) => {
      if (!lote.loteId) {
        setMessage('Este lote não pode ser editado');
        return;
      }

      try {
        setLoadingCardId(lote.loteId);
        setProducaoLoading(true);
        const res = await fetch(`/api/producao/fermentacao/lote/${lote.loteId}`);
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
        setMessage(getVisibleErrorMessage(err, 'Erro ao carregar lote de fermentação'));
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
      const confirmou = window.confirm('Excluir este lote de fermentação?');
      if (!confirmou) return;

      setDeletingLoteId(lote.loteId);
      setMessage(null);
      try {
        const res = await fetch(`/api/producao/fermentacao/lote/${lote.loteId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao excluir lote');
        await refreshOrdensOnly();
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao excluir lote'));
      } finally {
        setDeletingLoteId(null);
      }
    },
    [refreshOrdensOnly, setMessage],
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
        const res = await fetch(`/api/producao/fermentacao/lote/${editingLote.loteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assadeiras: producaoData.caixas,
            unidades: producaoData.unidades,
            fotoUrl: producaoData.fermentacaoFotoUrl,
            fotoId: producaoData.fermentacaoFotoId,
            fotoUploadedAt: producaoData.fermentacaoFotoUploadedAt,
            continuaProduzindo: options?.continuaProduzindo ?? true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');
        setMessage('Produção de fermentação atualizada com sucesso!');
        await refreshOrdensOnly();
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao salvar produção de fermentação'));
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

  const toolbarMetrics = useMemo(() => {
    const produzido = ordens.reduce((sum, ordem) => sum + ordem.produzido, 0);
    const meta = ordens.reduce((sum, ordem) => sum + ordem.aProduzir, 0);
    const falta = Math.max(0, meta - produzido);
    const progressoPct = meta > 0 ? Math.min(100, (produzido / meta) * 100) : 0;

    return {
      produzido,
      meta,
      falta,
      progressoPct,
      metaAtingida: falta === 0,
    };
  }, [ordens]);

  const worklist = useMemo(
    () =>
      buildFermentacaoWorklistData({
        naoFinalizados,
        finalizados,
        ordens,
        selectedDate,
        loadingCardId,
        deletingLoteId,
        creatingLoteOrdemId,
      }),
    [
      naoFinalizados,
      finalizados,
      ordens,
      selectedDate,
      loadingCardId,
      deletingLoteId,
      creatingLoteOrdemId,
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
      fermentacaoFotoUrl: editingLote?.fotoUrl,
      fermentacaoFotoId: editingLote?.fotoId,
      fermentacaoFotoUploadedAt: editingLote?.fotoUploadedAt,
    };
  }, [selectedOrdem, isNewLoteModal, editingLote]);

  return (
    <>
      <RealizadoEtapa
        config={FERMENTACAO_ETAPA_CONFIG}
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
          onEditLote: handleEditLoteById,
          onDeleteLote: handleDeleteLoteById,
        }}
      />

      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={onCloseModal}
        isNewLote={isNewLoteModal}
        onSave={handleSaveProducao}
        onSaveSuccess={refreshOrdensOnly}
        initialData={selectedInitialData}
        produto={selectedOrdem?.produto || ''}
        cliente={selectedOrdem?.tipoEstoque || ''}
        loteId={editingLote?.loteId}
        ordemProducaoId={selectedOrdem?.ordemProducaoId}
        pedidoQuantidades={selectedPedidoQuantidades}
        loading={producaoLoading}
        mode="fermentacao"
        modoQuantidade={selectedOrdem?.modoQuantidade || 'assadeiras'}
        metaReferencia={selectedOrdem?.metaReferencia}
        metaPlanejada={selectedOrdem?.metaPlanejada}
        produzidoAtual={selectedOrdem?.produzido || 0}
        etapaUnidade={(selectedOrdem?.unidade || 'lt').toUpperCase()}
      />
    </>
  );
}
