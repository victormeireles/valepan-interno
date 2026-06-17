'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import {
  EtapaProductAccordion,
  ProductCompactCard,
  RealizadoHeader,
  ThreeColumnLayout,
} from '@/components/Realizado';
import {
  loteToPainelItemEtapa,
  splitOrdensPorFinalizacao,
  type PainelLoteItemEtapa,
} from '@/domain/realizado/etapa-painel-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import type { RealizadoGroup } from '@/domain/types/realizado';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import type { ProducaoData } from '@/domain/types';

type EtapaGroup = RealizadoGroup & {
  ordem: PainelOrdemEtapa;
};

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export default function ProducaoFornoPage() {
  const latestDate = useLatestDataDate('forno');
  const [ordens, setOrdens] = useState<PainelOrdemEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(latestDate);
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [isNewLoteModal, setIsNewLoteModal] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<PainelOrdemEtapa | null>(null);
  const [editingLote, setEditingLote] = useState<PainelLoteItemEtapa | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [deletingLoteId, setDeletingLoteId] = useState<string | null>(null);
  const [creatingLoteOrdemId, setCreatingLoteOrdemId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(latestDate);
  }, [latestDate]);

  const refreshPainelData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/painel/forno?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
      setOrdens((data.ordens || []) as PainelOrdemEtapa[]);
    } catch (err) {
      console.error('Erro ao recarregar painel de forno:', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate]);

  const loadPainel = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/painel/forno?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
      setOrdens((data.ordens || []) as PainelOrdemEtapa[]);
    } catch (err) {
      setMessage(getVisibleErrorMessage(err, 'Erro ao carregar o painel'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadPainel();
  }, [loadPainel]);

  useEffect(() => {
    if (producaoModalOpen) return;
    const interval = setInterval(() => void refreshPainelData(), 60_000);
    return () => clearInterval(interval);
  }, [producaoModalOpen, refreshPainelData]);

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
    [ordens],
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
        await refreshPainelData();
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao excluir lote'));
      } finally {
        setDeletingLoteId(null);
      }
    },
    [refreshPainelData],
  );

  const handleSaveProducao = useCallback(
    async (producaoData: ProducaoData) => {
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
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');
        setMessage('Produção de forno atualizada com sucesso!');
        await refreshPainelData();
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao salvar produção de forno'));
      } finally {
        setProducaoLoading(false);
      }
    },
    [editingLote, refreshPainelData],
  );

  const renderLote = useCallback(
    (ordem: PainelOrdemEtapa, lote: PainelLoteItemEtapa) => {
      const produzidoDetalhes = QuantityBreakdown.buildEntries([
        { quantidade: lote.assadeiras || 0, unidade: 'lt' },
        { quantidade: lote.unidades || 0, unidade: 'un' },
      ]);
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
      const detalhesProduzido = QuantityBreakdown.buildEntries([
        { quantidade: ordem.produzidoBreakdown.assadeiras, unidade: 'lt' },
        { quantidade: ordem.produzidoBreakdown.unidades, unidade: 'un' },
      ]);
      const detalhesMeta = QuantityBreakdown.buildEntries([
        { quantidade: ordem.pedido.assadeiras, unidade: 'lt' },
        { quantidade: ordem.pedido.unidades, unidade: 'un' },
      ]);

      return (
        <EtapaProductAccordion
          key={ordem.ordemProducaoId}
          instanceId={`${selectedDate}|${ordem.ordemProducaoId}`}
          produto={ordem.produto}
          somaProduzido={ordem.produzido}
          somaAProduzir={ordem.aProduzir}
          unidade={ordem.unidade}
          detalhesProduzido={detalhesProduzido}
          detalhesMeta={detalhesMeta}
          horarioProducao={undefined}
          onNovoLote={
            allowNovoLote && ordem.produzido < ordem.aProduzir
              ? () => handleNovoLote(ordem)
              : undefined
          }
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

  const gruposNaoFinalizados = useMemo<EtapaGroup[]>(
    () =>
      naoFinalizados.map((ordem) => ({
        key: ordem.ordemProducaoId,
        items: [],
        ordem,
      })),
    [naoFinalizados],
  );

  const gruposFinalizados = useMemo<EtapaGroup[]>(
    () =>
      finalizados.map((ordem) => ({
        key: ordem.ordemProducaoId,
        items: [],
        ordem,
      })),
    [finalizados],
  );

  const renderGroup = useCallback(
    (group: RealizadoGroup, allowNovoLote: boolean) => {
      const typedGroup = group as EtapaGroup;
      return (
        <div className="bg-gray-800/20 border border-gray-600/30 rounded-lg p-3 space-y-2">
          {renderOrdemAccordion(typedGroup.ordem, allowNovoLote)}
        </div>
      );
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
      fornoFotoUrl: editingLote?.fotoUrl,
      fornoFotoId: editingLote?.fotoId,
      fornoFotoUploadedAt: editingLote?.fotoUploadedAt,
    };
  }, [selectedOrdem, isNewLoteModal, editingLote]);

  const totalLotes = useMemo(
    () => ordens.reduce((sum, ordem) => sum + ordem.lotes.length, 0),
    [ordens],
  );

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#330804' }}>
      <RealizadoHeader
        title="Realizado: Forno"
        icon="🔥"
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
          <div className="text-center py-16 text-gray-300 text-xl">Carregando...</div>
        ) : (
          <>
            {refreshing ? (
              <div
                className="mb-3 flex items-center gap-2 text-sm text-gray-300"
                role="status"
                aria-live="polite"
              >
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-500 border-t-amber-300 animate-spin motion-reduce:animate-none" />
                Atualizando dados...
              </div>
            ) : null}

            {gruposNaoFinalizados.length > 0 && (
              <div className="mb-8">
                <ThreeColumnLayout
                  groups={gruposNaoFinalizados}
                  columnCount={3}
                  renderGroup={(group) => renderGroup(group, true)}
                />
              </div>
            )}

            {gruposFinalizados.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Finalizados</h2>
                <ThreeColumnLayout
                  groups={gruposFinalizados}
                  columnCount={3}
                  renderGroup={(group) => renderGroup(group, false)}
                />
              </div>
            )}
          </>
        )}

        <footer className="mt-6 text-center text-gray-300 text-sm">
          {gruposNaoFinalizados.length + gruposFinalizados.length} ordens • {totalLotes} lotes
        </footer>
      </div>

      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={onCloseModal}
        isNewLote={isNewLoteModal}
        onSave={handleSaveProducao}
        onSaveSuccess={refreshPainelData}
        initialData={selectedInitialData}
        produto={selectedOrdem?.produto || ''}
        cliente={selectedOrdem?.tipoEstoque || ''}
        loteId={editingLote?.loteId}
        ordemProducaoId={selectedOrdem?.ordemProducaoId}
        pedidoQuantidades={selectedPedidoQuantidades}
        loading={producaoLoading}
        mode="forno"
        modoQuantidade={selectedOrdem?.modoQuantidade || 'assadeiras'}
      />
    </div>
  );
}
