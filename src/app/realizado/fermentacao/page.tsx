'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import {
  EtapaAssadeirasDashboard,
  EtapaProductAccordion,
  ProductCompactCard,
  RealizadoHeader,
  ThreeColumnLayout,
} from '@/components/Realizado';
import {
  buildEtapaDetalhesQuantidade,
  loteToPainelItemEtapa,
  splitOrdensPorFinalizacao,
  type PainelLoteItemEtapa,
} from '@/domain/realizado/etapa-painel-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import type { RealizadoGroup } from '@/domain/types/realizado';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import { useEtapaPainelCarga } from '@/hooks/useEtapaPainelCarga';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import type { ProducaoData } from '@/domain/types';

type EtapaOrdemLayoutItem = RealizadoGroup & {
  ordem: PainelOrdemEtapa;
};

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
    async (producaoData: ProducaoData) => {
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

  const renderLote = useCallback(
    (ordem: PainelOrdemEtapa, lote: PainelLoteItemEtapa) => {
      const produzidoDetalhes = buildEtapaDetalhesQuantidade(
        { assadeiras: lote.assadeiras || 0, unidades: lote.unidades || 0 },
        lote.modoQuantidade,
      );
      const isDeleting = deletingLoteId === lote.loteId;
      const trailingSlot = (
        <button
          type="button"
          className="
            inline-flex items-center justify-center
            min-h-11 min-w-11 rounded-md text-red-400
            hover:bg-gray-700/50 hover:text-red-300
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
            disabled:opacity-60 disabled:cursor-wait
          "
          aria-label={`Excluir lote de ${lote.produto}`}
          aria-busy={isDeleting}
          disabled={isDeleting}
          onClick={(event) => {
            event.stopPropagation();
            void handleDeleteLote(lote);
          }}
        >
          {isDeleting ? (
            <span
              className="inline-block h-5 w-5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : (
            <span className="material-icons text-xl" aria-hidden>
              delete_outline
            </span>
          )}
        </button>
      );

      return (
        <ProductCompactCard
          key={lote.loteId}
          produto={lote.produto}
          produzido={lote.produzido}
          aProduzir={lote.aProduzir}
          unidade={lote.unidade}
          hasPhoto={Boolean(lote.fotoUrl)}
          photoColor="white"
          onPhotoClick={() => {
            if (lote.fotoUrl) window.open(lote.fotoUrl, '_blank', 'noopener,noreferrer');
          }}
          onClick={() => void handleEditProducao(ordem, lote)}
          isLoading={loadingCardId === lote.loteId}
          detalhesProduzido={produzidoDetalhes}
          horarioEmbalagem={formatLocalTimeHHmm(lote.produzidoEm || '') ?? undefined}
          trailingSlot={trailingSlot}
        />
      );
    },
    [deletingLoteId, handleDeleteLote, handleEditProducao, loadingCardId],
  );

  const renderOrdemAccordion = useCallback(
    (ordem: PainelOrdemEtapa, allowNovoLote: boolean) => {
      const detalhesProduzido = buildEtapaDetalhesQuantidade(
        ordem.produzidoBreakdown,
        ordem.modoQuantidade,
      );
      const detalhesMeta = buildEtapaDetalhesQuantidade(ordem.pedido, ordem.modoQuantidade);

      return (
        <EtapaProductAccordion
          key={ordem.ordemProducaoId}
          instanceId={`${selectedDate}|${ordem.ordemProducaoId}`}
          produto={ordem.produto}
          cliente={ordem.tipoEstoque}
          assadeiraNome={ordem.assadeiraNome}
          observacao={ordem.observacao || undefined}
          somaProduzido={ordem.produzido}
          somaAProduzir={ordem.aProduzir}
          unidade={ordem.unidade}
          detalhesProduzido={detalhesProduzido}
          detalhesMeta={detalhesMeta}
          horarioProducao={undefined}
          onNovoLote={allowNovoLote ? () => handleNovoLote(ordem) : undefined}
          isNovoLoteLoading={creatingLoteOrdemId === ordem.ordemProducaoId}
          renderLots={() =>
            ordem.lotes.map((lote) => renderLote(ordem, loteToPainelItemEtapa(ordem, lote)))
          }
        />
      );
    },
    [creatingLoteOrdemId, handleNovoLote, renderLote, selectedDate],
  );

  const { naoFinalizados, finalizados } = useMemo(
    () => splitOrdensPorFinalizacao(ordens),
    [ordens],
  );

  const itensNaoFinalizados = useMemo<EtapaOrdemLayoutItem[]>(
    () =>
      naoFinalizados.map((ordem) => ({
        key: ordem.ordemProducaoId,
        items: [],
        ordem,
      })),
    [naoFinalizados],
  );

  const itensFinalizados = useMemo<EtapaOrdemLayoutItem[]>(
    () =>
      finalizados.map((ordem) => ({
        key: ordem.ordemProducaoId,
        items: [],
        ordem,
      })),
    [finalizados],
  );

  const renderOrdemItem = useCallback(
    (group: RealizadoGroup, allowNovoLote: boolean) => {
      const { ordem } = group as EtapaOrdemLayoutItem;
      return renderOrdemAccordion(ordem, allowNovoLote);
    },
    [renderOrdemAccordion],
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

  const totalLotes = useMemo(
    () => ordens.reduce((sum, ordem) => sum + ordem.lotes.length, 0),
    [ordens],
  );

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#8b773a' }}>
      <RealizadoHeader
        title="Realizado: Fermentação"
        icon="🍞"
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <div className="p-4">
        {message && (
          <div
            className={`mb-4 p-4 rounded-md border ${
              message.includes('sucesso')
                ? 'bg-green-800/30 border-green-600 text-green-100'
                : 'bg-red-800/30 border-red-600 text-red-100'
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-200 text-xl">Carregando...</div>
        ) : (
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start transition-opacity duration-200 motion-reduce:transition-none ${
              refreshing ? 'opacity-70 pointer-events-none' : ''
            }`}
          >
            <div className="min-w-0 space-y-8">
              {refreshing ? (
                <div
                  className="mb-3 flex items-center gap-2 text-sm text-gray-200"
                  role="status"
                  aria-live="polite"
                >
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-400 border-t-amber-200 animate-spin motion-reduce:animate-none" />
                  Atualizando dados...
                </div>
              ) : null}

              {itensNaoFinalizados.length > 0 && (
                <div className="mb-8">
                  <ThreeColumnLayout
                    groups={itensNaoFinalizados}
                    columnCount={1}
                    renderGroup={(group) => renderOrdemItem(group, true)}
                  />
                </div>
              )}

              {itensFinalizados.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Finalizados</h2>
                  <ThreeColumnLayout
                    groups={itensFinalizados}
                    columnCount={1}
                    renderGroup={(group) => renderOrdemItem(group, true)}
                  />
                </div>
              )}
            </div>

            <EtapaAssadeirasDashboard
              selectedDate={selectedDate}
              items={dashboardItems}
              comparisonPrev={
                dateComparisonPrev
                  ? { date: dateComparisonPrev, items: dashboardPrev }
                  : null
              }
              comparisonWeek={{ date: comparisonWeekDate, items: dashboardWeek }}
            />
          </div>
        )}

        <footer className="mt-6 text-center text-gray-200 text-sm">
          {itensNaoFinalizados.length + itensFinalizados.length} ordens • {totalLotes} lotes
        </footer>
      </div>

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
      />
    </div>
  );
}
