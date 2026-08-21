'use client';

import { useCallback, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import RealizadoEtapa from '@/components/Realizado/RealizadoEtapa';
import EtapaReabrirConfirmDialog from '@/components/Realizado/etapa/EtapaReabrirConfirmDialog';
import { useRealizadoTurnoUi } from '@/components/Realizado/turno/useRealizadoTurnoUi';
import { splitPedidosEmbalagemPorStatus } from '@/domain/embalagem/embalagem-painel-adapter';
import {
  buildEmbalagemLoteLookup,
  buildEmbalagemPedidoLookup,
  buildEmbalagemWorklistData,
  EMBALAGEM_ETAPA_CONFIG,
} from '@/domain/embalagem/embalagem-etapa-adapter';
import { buildEmbalagemToolbarMetrics } from '@/domain/embalagem/build-embalagem-toolbar-metrics';
import type { PainelLoteItem } from '@/domain/realizado/painel-pedido-adapter';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import { ProducaoData } from '@/domain/types';
import { useEmbalagemPainelCarga } from '@/hooks/useEmbalagemPainelCarga';
import { useEmbalagemReabrirOp } from '@/hooks/useEmbalagemReabrirOp';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

function formatQuantidade(caixas: number, pacotes: number): string {
  const parts: string[] = [];
  if (caixas > 0) parts.push(`${caixas} cx`);
  if (pacotes > 0) parts.push(`${pacotes} pct`);
  return parts.length > 0 ? parts.join(' + ') : '0';
}

export default function ProducaoEmbalagemPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [isNewLoteModal, setIsNewLoteModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelLoteItem | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [deletingLoteId, setDeletingLoteId] = useState<string | null>(null);

  const {
    pedidos,
    loading,
    refreshing,
    dashboardDiaItems,
    comparisonWeekItems,
    comparisonPrevItems,
    comparisonWeekDate,
    dateComparisonPrev,
    turnos,
    loadCargaEmbalagem,
    refreshPedidosOnly,
  } = useEmbalagemPainelCarga({
    selectedDate,
    setSelectedDate,
    producaoModalOpen,
    setMessage,
  });

  const { turnoChip, turnoSheet, ensureTurnoThen, onTurnoRequerido } =
    useRealizadoTurnoUi({
      etapa: 'embalagem',
      turnos,
      turnoAtivo: null,
      onError: (msg) => setMessage(msg),
    });

  const pedidoLookup = useMemo(() => buildEmbalagemPedidoLookup(pedidos), [pedidos]);
  const loteLookup = useMemo(() => buildEmbalagemLoteLookup(pedidos), [pedidos]);
  const pedidoSelecionado = useMemo(() => {
    if (!editingItem?.pedidoEmbalagemId) return null;
    return pedidoLookup.get(editingItem.pedidoEmbalagemId) ?? null;
  }, [editingItem?.pedidoEmbalagemId, pedidoLookup]);

  const handleEditProducao = useCallback(async (item: PainelLoteItem) => {
    if (!item.loteId) {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(`${item.cliente}-${item.produto}-${item.loteId}`);
      setProducaoLoading(true);
      const res = await fetch(`/api/producao/embalagem/lote/${item.loteId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados de produção');

      setIsNewLoteModal(false);
      setEditingItem({
        ...item,
        caixas: data.data.caixas || 0,
        pacotes: data.data.pacotes || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
        pedidoCaixas: data.data.pedidoCaixas || 0,
        pedidoPacotes: data.data.pedidoPacotes || 0,
        pedidoUnidades: data.data.pedidoUnidades || 0,
        pedidoKg: data.data.pedidoKg || 0,
        pacoteFotoUrl: data.data.pacoteFotoUrl,
        pacoteFotoId: data.data.pacoteFotoId,
        pacoteFotoUploadedAt: data.data.pacoteFotoUploadedAt,
        etiquetaFotoUrl: data.data.etiquetaFotoUrl,
        etiquetaFotoId: data.data.etiquetaFotoId,
        etiquetaFotoUploadedAt: data.data.etiquetaFotoUploadedAt,
        palletFotoUrl: data.data.palletFotoUrl,
        palletFotoId: data.data.palletFotoId,
        palletFotoUploadedAt: data.data.palletFotoUploadedAt,
        obsEmbalagem: data.data.obsEmbalagem,
      });
      setProducaoModalOpen(true);
    } catch (err) {
      setMessage(getVisibleErrorMessage(err, 'Erro ao carregar dados de produção'));
    } finally {
      setProducaoLoading(false);
      setLoadingCardId(null);
    }
  }, []);

  const handleDeleteLote = useCallback(
    async (item: PainelLoteItem) => {
      if (!item.loteId) {
        setMessage('Este lote não pode ser excluído');
        return;
      }

      const confirmado = window.confirm(
        'Excluir este lote?\n\nSerá registrada uma saída de estoque com observação de exclusão por preenchimento incorreto.',
      );
      if (!confirmado) return;

      setDeletingLoteId(item.loteId);
      setMessage(null);
      try {
        const res = await fetch(`/api/producao/embalagem/lote/${item.loteId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao excluir lote');
        await loadCargaEmbalagem(false);
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao excluir lote'));
      } finally {
        setDeletingLoteId(null);
      }
    },
    [loadCargaEmbalagem],
  );

  const handleNovoLote = useCallback((pedido: PainelPedidoEmbalagem) => {
    ensureTurnoThen(() => {
      setIsNewLoteModal(true);
      setEditingItem({
        pedidoEmbalagemId: pedido.pedidoEmbalagemId,
        cliente: pedido.cliente,
        produto: pedido.produto,
        observacao: pedido.observacao,
        congelado: pedido.congelado ?? 'Não',
        unidade: pedido.unidade,
        aProduzir: pedido.aProduzir,
        produzido: 0,
        dataFabricacao: pedido.dataFabricacao,
        caixas: 0,
        pacotes: 0,
        unidades: 0,
        kg: 0,
        pedidoCaixas: pedido.pedido.caixas,
        pedidoPacotes: pedido.pedido.pacotes,
        pedidoUnidades: pedido.pedido.unidades,
        pedidoKg: pedido.pedido.kg,
        metaCaixas: pedido.pedido.caixas,
        metaPacotes: pedido.pedido.pacotes,
        metaUnidades: pedido.pedido.unidades,
        metaKg: pedido.pedido.kg,
      });
      setProducaoModalOpen(true);
    });
  }, [ensureTurnoThen]);

  const handleNovoLoteById = useCallback(
    (pedidoEmbalagemId: string) => {
      const pedido = pedidoLookup.get(pedidoEmbalagemId);
      if (pedido) handleNovoLote(pedido);
    },
    [pedidoLookup, handleNovoLote],
  );

  const { reabrindoOpId, handleReabrirOpById, reabrirDialogProps } = useEmbalagemReabrirOp({
    pedidoLookup,
    refreshPedidosOnly,
    onNovoLote: handleNovoLote,
    setMessage,
    getVisibleErrorMessage,
  });

  const handleEditLoteById = useCallback(
    (loteId: string) => {
      const item = loteLookup.get(loteId);
      if (item) void handleEditProducao(item);
    },
    [loteLookup, handleEditProducao],
  );

  const handleDeleteLoteById = useCallback(
    (loteId: string) => {
      const item = loteLookup.get(loteId);
      if (item) void handleDeleteLote(item);
    },
    [loteLookup, handleDeleteLote],
  );

  const refreshPainelData = async () => {
    await loadCargaEmbalagem(false);
  };

  const handleSaveProducao = async (
    producaoData: ProducaoData,
    options?: { continuaProduzindo?: boolean },
  ) => {
    if (!editingItem?.loteId) return;

    try {
      setProducaoLoading(true);
      setMessage(null);

      const res = await fetch(`/api/producao/embalagem/lote/${editingItem.loteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...producaoData,
          continuaProduzindo: options?.continuaProduzindo ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');

      setEditingItem(null);
      setProducaoLoading(false);
      if (data.insumoConsumo?.avisos?.length) {
        setMessage(`Aviso: ${data.insumoConsumo.avisos.join(' ')}`);
        setTimeout(() => setMessage(null), 6000);
      } else {
        setMessage('Produção atualizada com sucesso!');
        setTimeout(() => setMessage(null), 3000);
      }
      await refreshPainelData();
    } catch (err) {
      setMessage(getVisibleErrorMessage(err, 'Erro ao salvar produção'));
      setProducaoLoading(false);
    }
  };

  const handleInsumoConsumoAviso = useCallback(
    (avisos: string[]) => {
      setMessage(`Aviso: ${avisos.join(' ')}`);
      setTimeout(() => setMessage(null), 6000);
    },
    [setMessage],
  );

  const dashboardItems = dashboardDiaItems;
  const toolbarMetrics = useMemo(
    () => buildEmbalagemToolbarMetrics(pedidos),
    [pedidos],
  );

  const { naoFinalizados, finalizados } = useMemo(
    () => splitPedidosEmbalagemPorStatus(pedidos),
    [pedidos],
  );

  const totais = useMemo(() => {
    const totalCaixasProduzido = pedidos.reduce((sum, p) => sum + p.produzido.caixas, 0);
    const totalPacotesProduzido = pedidos.reduce((sum, p) => sum + p.produzido.pacotes, 0);
    const totalCaixasMeta = pedidos.reduce((sum, p) => sum + p.pedido.caixas, 0);
    const totalPacotesMeta = pedidos.reduce((sum, p) => sum + p.pedido.pacotes, 0);

    return {
      produzido: formatQuantidade(totalCaixasProduzido, totalPacotesProduzido),
      meta: formatQuantidade(totalCaixasMeta, totalPacotesMeta),
      faltaCx: Math.max(0, totalCaixasMeta - totalCaixasProduzido),
    };
  }, [pedidos]);

  const worklist = useMemo(
    () =>
      buildEmbalagemWorklistData({
        naoFinalizados,
        finalizados,
        pedidos,
        selectedDate,
        loadingCardId,
        deletingLoteId,
        reabrindoOpId,
      }),
    [
      naoFinalizados,
      finalizados,
      pedidos,
      selectedDate,
      loadingCardId,
      deletingLoteId,
      reabrindoOpId,
    ],
  );

  return (
    <>
      <RealizadoEtapa
        config={EMBALAGEM_ETAPA_CONFIG}
        ritmoCompacto
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        toolbar={toolbarMetrics}
        loading={loading}
        refreshing={refreshing}
        message={message}
        worklist={worklist}
        dashboardHora={{
          items: dashboardItems,
          comparisonPrev: dateComparisonPrev
            ? { date: dateComparisonPrev, items: comparisonPrevItems }
            : null,
          comparisonWeek: { date: comparisonWeekDate, items: comparisonWeekItems },
        }}
        footer={{
          grupos:
            (naoFinalizados.length > 0 ? 1 : 0) + (finalizados.length > 0 ? 1 : 0),
          pedidos: pedidos.length,
          produzidoLabel: totais.produzido,
          metaLabel: totais.meta,
        }}
        callbacks={{
          onNovoLote: handleNovoLoteById,
          onReabrirOp: handleReabrirOpById,
          onEditLote: handleEditLoteById,
          onDeleteLote: handleDeleteLoteById,
        }}
        turnoChip={turnoChip}
      />

      {reabrirDialogProps ? (
        <EtapaReabrirConfirmDialog {...reabrirDialogProps} />
      ) : null}

      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={() => {
          setProducaoModalOpen(false);
          setIsNewLoteModal(false);
          setEditingItem(null);
        }}
        isNewLote={isNewLoteModal}
        onSave={handleSaveProducao}
        onInsumoConsumoAviso={handleInsumoConsumoAviso}
        onSaveSuccess={refreshPainelData}
        onTurnoRequerido={onTurnoRequerido}
        initialData={
          editingItem
            ? {
                caixas: editingItem.caixas || 0,
                pacotes: editingItem.pacotes || 0,
                unidades: editingItem.unidades || 0,
                kg: editingItem.kg || 0,
                pacoteFotoUrl: editingItem.pacoteFotoUrl,
                pacoteFotoId: editingItem.pacoteFotoId,
                pacoteFotoUploadedAt: editingItem.pacoteFotoUploadedAt,
                etiquetaFotoUrl: editingItem.etiquetaFotoUrl,
                etiquetaFotoId: editingItem.etiquetaFotoId,
                etiquetaFotoUploadedAt: editingItem.etiquetaFotoUploadedAt,
                palletFotoUrl: editingItem.palletFotoUrl,
                palletFotoId: editingItem.palletFotoId,
                palletFotoUploadedAt: editingItem.palletFotoUploadedAt,
                obsEmbalagem: editingItem.obsEmbalagem || '',
              }
            : undefined
        }
        produto={editingItem?.produto || ''}
        cliente={editingItem?.cliente || ''}
        loteId={editingItem?.loteId}
        pedidoEmbalagemId={editingItem?.pedidoEmbalagemId}
        congelado={editingItem?.congelado ?? 'Não'}
        pedidoQuantidades={
          editingItem
            ? {
                caixas: editingItem.pedidoCaixas || 0,
                pacotes: editingItem.pedidoPacotes || 0,
                unidades: editingItem.pedidoUnidades || 0,
                kg: editingItem.pedidoKg || 0,
              }
            : undefined
        }
        pedidoMetaOriginal={
          editingItem
            ? {
                caixas: editingItem.metaCaixas ?? 0,
                pacotes: editingItem.metaPacotes ?? 0,
                unidades: editingItem.metaUnidades ?? 0,
                kg: editingItem.metaKg ?? 0,
              }
            : undefined
        }
        metaReferencia={pedidoSelecionado?.metaEfetiva ?? editingItem?.aProduzir ?? 0}
        metaPlanejada={pedidoSelecionado?.metaPlanejada ?? editingItem?.pedidoCaixas ?? 0}
        produzidoAtual={pedidoSelecionado?.produzidoScalar ?? 0}
        etapaUnidade={(pedidoSelecionado?.unidade ?? editingItem?.unidade ?? 'cx').toUpperCase()}
        loading={producaoLoading}
        mode="embalagem"
      />

      {turnoSheet}
    </>
  );
}
