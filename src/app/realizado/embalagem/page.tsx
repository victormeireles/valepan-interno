'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import RealizadoEtapa from '@/components/Realizado/RealizadoEtapa';
import {
  pedidosToDashboardItems,
  snapshotsToDashboardItems,
} from '@/domain/embalagem/painel-dashboard-adapter';
import { splitPedidosEmbalagemEmGrupos } from '@/domain/embalagem/embalagem-painel-adapter';
import {
  buildEmbalagemLoteLookup,
  buildEmbalagemPedidoLookup,
  buildEmbalagemWorklistData,
  EMBALAGEM_ETAPA_CONFIG,
} from '@/domain/embalagem/embalagem-etapa-adapter';
import type { PainelLoteItem } from '@/domain/realizado/painel-pedido-adapter';
import type {
  DashboardSnapshot,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';
import { ProducaoData } from '@/domain/types';
import {
  addCalendarDaysISO,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

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
  const initialDateResolved = useRef(false);
  const [pedidos, setPedidos] = useState<PainelPedidoEmbalagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [isNewLoteModal, setIsNewLoteModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelLoteItem | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [deletingLoteId, setDeletingLoteId] = useState<string | null>(null);
  const [comparisonWeekItems, setComparisonWeekItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [comparisonPrevItems, setComparisonPrevItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [comparisonWeekDate, setComparisonWeekDate] = useState<string>(() =>
    addCalendarDaysISO(getTodayISOInBrazilTimezone(), -7),
  );
  const [dateComparisonPrev, setDateComparisonPrev] = useState<string | null>(null);

  const applyCargaResponse = useCallback(
    (
      data: {
        pedidos: PainelPedidoEmbalagem[];
        ultimaDataComDados: string | null;
        comparacaoSemana: { date: string; items: DashboardSnapshot[] };
        comparacaoAnterior: { date: string | null; items: DashboardSnapshot[] };
      },
      currentDate: string,
    ) => {
      if (
        !initialDateResolved.current &&
        data.ultimaDataComDados &&
        data.ultimaDataComDados !== currentDate
      ) {
        initialDateResolved.current = true;
        setSelectedDate(data.ultimaDataComDados);
        return;
      }
      initialDateResolved.current = true;
      setPedidos(data.pedidos);
      setComparisonWeekDate(data.comparacaoSemana.date);
      setComparisonWeekItems(snapshotsToDashboardItems(data.comparacaoSemana.items));
      setComparisonPrevItems(snapshotsToDashboardItems(data.comparacaoAnterior.items));
      setDateComparisonPrev(data.comparacaoAnterior.date);
    },
    [],
  );

  const loadCargaEmbalagem = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const res = await fetch(`/api/painel/embalagem/carga?date=${selectedDate}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        applyCargaResponse(data, selectedDate);
      } catch (err) {
        if (showSpinner) {
          setMessage(getVisibleErrorMessage(err, 'Erro ao carregar o painel'));
        } else {
          console.error('Erro ao recarregar carga embalagem:', err);
        }
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, applyCargaResponse],
  );

  const refreshPedidosOnly = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
      setPedidos((data.pedidos || []) as PainelPedidoEmbalagem[]);
    } catch (err) {
      console.error('Erro ao recarregar pedidos:', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadCargaEmbalagem(true);
  }, [selectedDate, loadCargaEmbalagem]);

  useEffect(() => {
    if (producaoModalOpen) return;
    const interval = setInterval(() => void refreshPedidosOnly(), 60_000);
    return () => clearInterval(interval);
  }, [selectedDate, producaoModalOpen, refreshPedidosOnly]);

  const pedidoLookup = useMemo(() => buildEmbalagemPedidoLookup(pedidos), [pedidos]);
  const loteLookup = useMemo(() => buildEmbalagemLoteLookup(pedidos), [pedidos]);

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
        await refreshPedidosOnly();
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao excluir lote'));
      } finally {
        setDeletingLoteId(null);
      }
    },
    [refreshPedidosOnly],
  );

  const handleNovoLote = useCallback((pedido: PainelPedidoEmbalagem) => {
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
      pedidoCaixas: Math.max(0, pedido.pedido.caixas - pedido.produzido.caixas),
      pedidoPacotes: Math.max(0, pedido.pedido.pacotes - pedido.produzido.pacotes),
      pedidoUnidades: Math.max(0, pedido.pedido.unidades - pedido.produzido.unidades),
      pedidoKg: Math.max(0, pedido.pedido.kg - pedido.produzido.kg),
      metaCaixas: pedido.pedido.caixas,
      metaPacotes: pedido.pedido.pacotes,
      metaUnidades: pedido.pedido.unidades,
      metaKg: pedido.pedido.kg,
    });
    setProducaoModalOpen(true);
  }, []);

  const handleNovoLoteById = useCallback(
    (pedidoEmbalagemId: string) => {
      const pedido = pedidoLookup.get(pedidoEmbalagemId);
      if (pedido) handleNovoLote(pedido);
    },
    [pedidoLookup, handleNovoLote],
  );

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
    await refreshPedidosOnly();
  };

  const handleSaveProducao = async (producaoData: ProducaoData) => {
    if (!editingItem?.loteId) return;

    try {
      setProducaoLoading(true);
      setMessage(null);

      const res = await fetch(`/api/producao/embalagem/lote/${editingItem.loteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producaoData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');

      setEditingItem(null);
      setProducaoLoading(false);
      setMessage('Produção atualizada com sucesso!');
      await refreshPainelData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(getVisibleErrorMessage(err, 'Erro ao salvar produção'));
      setProducaoLoading(false);
    }
  };

  const dashboardItems = useMemo(() => pedidosToDashboardItems(pedidos), [pedidos]);
  const resumoCx = useMemo(() => {
    const produzido = dashboardItems.reduce((sum, item) => sum + (item.caixas || 0), 0);
    const meta = dashboardItems.reduce((sum, item) => sum + (item.pedidoCaixas || 0), 0);
    const faltaCx = Math.max(0, meta - produzido);
    const progressoPct = meta > 0 ? Math.min(100, (produzido / meta) * 100) : 0;
    return { produzido, meta, faltaCx, progressoPct };
  }, [dashboardItems]);

  const { gruposNaoFinalizados, gruposFinalizados } = useMemo(
    () => splitPedidosEmbalagemEmGrupos(pedidos, selectedDate),
    [pedidos, selectedDate],
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
        gruposNaoFinalizados,
        gruposFinalizados,
        pedidos,
        selectedDate,
        loadingCardId,
        deletingLoteId,
      }),
    [
      gruposNaoFinalizados,
      gruposFinalizados,
      pedidos,
      selectedDate,
      loadingCardId,
      deletingLoteId,
    ],
  );

  return (
    <>
      <RealizadoEtapa
        config={EMBALAGEM_ETAPA_CONFIG}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        toolbar={{
          produzido: resumoCx.produzido,
          meta: resumoCx.meta,
          falta: resumoCx.faltaCx,
          progressoPct: resumoCx.progressoPct,
          metaAtingida: resumoCx.faltaCx === 0,
        }}
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
          grupos: gruposNaoFinalizados.length + gruposFinalizados.length,
          pedidos: pedidos.length,
          produzidoLabel: totais.produzido,
          metaLabel: totais.meta,
        }}
        callbacks={{
          onNovoLote: handleNovoLoteById,
          onEditLote: handleEditLoteById,
          onDeleteLote: handleDeleteLoteById,
        }}
      />

      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={() => {
          setProducaoModalOpen(false);
          setIsNewLoteModal(false);
          setEditingItem(null);
        }}
        isNewLote={isNewLoteModal}
        onSave={handleSaveProducao}
        onSaveSuccess={refreshPainelData}
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
        loading={producaoLoading}
        mode="embalagem"
      />
    </>
  );
}
