'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import { moveIdsToBottom, moveIdsToTop } from '@/domain/ordens-producao/ordem-selection';
import type { OrdemProducaoFormMode } from '@/components/OrdensProducao/useOrdemProducaoForm';
import { useOrdensProducaoSelection } from '@/components/OrdensProducao/useOrdensProducaoSelection';
import {
  ordensProducaoListManager,
  type OrdemProducaoCreateBody,
} from '@/lib/managers/ordens-producao-list-manager';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

type ToastState = { type: 'success' | 'error'; text: string } | null;

function applyOrderNumbers(
  items: OrdemProducaoPainelItem[],
  orderedIds: string[],
): OrdemProducaoPainelItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return orderedIds
    .map((id, index) => {
      const item = byId.get(id);
      if (!item) return null;
      return { ...item, ordemPlanejamento: index + 1 };
    })
    .filter((item): item is OrdemProducaoPainelItem => item !== null);
}

export function useOrdensProducaoPage() {
  const today = getTodayISOInBrazilTimezone();
  const [filterDate, setFilterDate] = useState(today);
  const [ordens, setOrdens] = useState<OrdemProducaoPainelItem[]>([]);
  const [resumo, setResumo] = useState({
    totalOrdens: 0,
    totalLatas: 0,
    totalUnidades: 0,
    totalCaixas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<OrdemProducaoFormMode>('create');
  const [editingOrder, setEditingOrder] = useState<OrdemProducaoPainelItem | undefined>();
  const [batchOpen, setBatchOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrdemProducaoPainelItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const ordemIds = useMemo(() => ordens.map((ordem) => ordem.id), [ordens]);
  const {
    selectedIds,
    selectedCount,
    allSelected,
    isSelected,
    toggle: toggleSelect,
    toggleAll: toggleSelectAll,
    clear: clearSelection,
  } = useOrdensProducaoSelection(ordemIds, filterDate);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    if (next) {
      window.setTimeout(() => setToast(null), 4000);
    }
  }, []);

  const fetchList = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordensProducaoListManager.fetchList(date);
      setOrdens(data.ordens);
      setResumo(data.resumo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordens');
      setOrdens([]);
      setResumo({ totalOrdens: 0, totalLatas: 0, totalUnidades: 0, totalCaixas: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList(filterDate);
  }, [filterDate, fetchList]);

  const persistReorder = useCallback(
    async (orderedIds: string[], previousOrdens: OrdemProducaoPainelItem[]) => {
      try {
        await ordensProducaoListManager.reorder(filterDate, orderedIds);
      } catch (err) {
        setOrdens(previousOrdens);
        showToast({
          type: 'error',
          text: err instanceof Error ? err.message : 'Falha ao reordenar',
        });
      }
    },
    [filterDate, showToast],
  );

  const handleReorder = useCallback(
    (orderedIds: string[]) => {
      const previous = ordens;
      setOrdens(applyOrderNumbers(ordens, orderedIds));
      void persistReorder(orderedIds, previous);
    },
    [ordens, persistReorder],
  );

  const moveOrder = useCallback(
    (ordem: OrdemProducaoPainelItem, direction: 'up' | 'down') => {
      const index = ordens.findIndex((item) => item.id === ordem.id);
      if (index < 0) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordens.length) return;
      const orderedIds = arrayMove(
        ordens.map((item) => item.id),
        index,
        targetIndex,
      );
      handleReorder(orderedIds);
    },
    [ordens, handleReorder],
  );

  const moveOrderToTop = useCallback(
    (ordem: OrdemProducaoPainelItem) => {
      const allIds = ordens.map((item) => item.id);
      const orderedIds = moveIdsToTop(allIds, [ordem.id]);
      if (orderedIds.join(',') === allIds.join(',')) return;
      handleReorder(orderedIds);
    },
    [ordens, handleReorder],
  );

  const moveOrderToBottom = useCallback(
    (ordem: OrdemProducaoPainelItem) => {
      const allIds = ordens.map((item) => item.id);
      const orderedIds = moveIdsToBottom(allIds, [ordem.id]);
      if (orderedIds.join(',') === allIds.join(',')) return;
      handleReorder(orderedIds);
    },
    [ordens, handleReorder],
  );

  const openCreate = () => {
    setFormMode('create');
    setEditingOrder(undefined);
    setFormOpen(true);
  };

  const openEdit = (ordem: OrdemProducaoPainelItem) => {
    setFormMode('edit');
    setEditingOrder(ordem);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingOrder(undefined);
  };

  const handleSave = async (
    body: OrdemProducaoCreateBody,
    mode: OrdemProducaoFormMode,
    id?: string,
  ) => {
    if (mode === 'edit' && id) {
      await ordensProducaoListManager.update(id, body);
      showToast({ type: 'success', text: 'Ordem atualizada' });
    } else {
      await ordensProducaoListManager.create(body);
      showToast({ type: 'success', text: 'Ordem criada' });
    }

    closeForm();
    if (body.dataProducao !== filterDate) {
      setFilterDate(body.dataProducao);
      return;
    }
    await fetchList(filterDate);
  };

  const handleDeleteFromForm = async (id: string) => {
    await ordensProducaoListManager.remove(id);
    showToast({ type: 'success', text: 'Ordem excluída' });
    closeForm();
    await fetchList(filterDate);
  };

  const requestDelete = (ordem: OrdemProducaoPainelItem) => {
    setDeleteTarget(ordem);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await ordensProducaoListManager.remove(deleteTarget.id);
      showToast({ type: 'success', text: 'Ordem excluída' });
      setDeleteTarget(null);
      await fetchList(filterDate);
    } catch (err) {
      showToast({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao excluir ordem',
      });
    }
  };

  const handleBatchSuccess = async () => {
    showToast({ type: 'success', text: 'Importação concluída' });
    await fetchList(filterDate);
  };

  const toggleSelectOrder = useCallback(
    (ordem: OrdemProducaoPainelItem) => {
      toggleSelect(ordem.id);
    },
    [toggleSelect],
  );

  const moveSelectedToTop = useCallback(() => {
    if (selectedIds.size === 0) return;
    const orderedIds = moveIdsToTop(
      ordens.map((ordem) => ordem.id),
      [...selectedIds],
    );
    handleReorder(orderedIds);
    showToast({
      type: 'success',
      text:
        selectedIds.size === 1
          ? '1 ordem movida para o topo'
          : `${selectedIds.size} ordens movidas para o topo`,
    });
  }, [selectedIds, ordens, handleReorder, showToast]);

  const requestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBulkDeleteOpen(true);
  }, [selectedIds]);

  const confirmBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = [...selectedIds];
      const { deleted, failed } = await ordensProducaoListManager.removeMany(ids);
      setBulkDeleteOpen(false);
      clearSelection();

      if (failed.length === 0) {
        showToast({
          type: 'success',
          text:
            deleted.length === 1
              ? '1 ordem excluída'
              : `${deleted.length} ordens excluídas`,
        });
      } else if (deleted.length > 0) {
        showToast({
          type: 'error',
          text: `${deleted.length} excluídas, ${failed.length} não puderam ser excluídas`,
        });
      } else {
        showToast({
          type: 'error',
          text: failed[0]?.error || 'Não foi possível excluir as ordens selecionadas',
        });
      }

      await fetchList(filterDate);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, clearSelection, showToast, fetchList, filterDate]);

  return {
    filterDate,
    setFilterDate,
    ordens,
    resumo,
    loading,
    error,
    toast,
    formOpen,
    formMode,
    editingOrder,
    batchOpen,
    deleteTarget,
    bulkDeleteOpen,
    bulkBusy,
    selectedCount,
    allSelected,
    isSelected,
    setBatchOpen,
    setDeleteTarget,
    setBulkDeleteOpen,
    fetchList,
    openCreate,
    openEdit,
    closeForm,
    handleReorder,
    moveOrder,
    moveOrderToTop,
    moveOrderToBottom,
    handleSave,
    handleDeleteFromForm,
    requestDelete,
    confirmDelete,
    requestBulkDelete,
    confirmBulkDelete,
    toggleSelectOrder,
    toggleSelectAll,
    clearSelection,
    moveSelectedToTop,
    handleBatchSuccess,
  };
}
