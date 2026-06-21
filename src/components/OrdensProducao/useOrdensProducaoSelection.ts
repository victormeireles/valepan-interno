'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  areAllIdsSelected,
  toggleIdInSelection,
} from '@/domain/ordens-producao/ordem-selection';

export function useOrdensProducaoSelection(ordemIds: string[], resetKey: string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [resetKey]);

  const selectedCount = selectedIds.size;
  const allSelected = useMemo(
    () => areAllIdsSelected(ordemIds, selectedIds),
    [ordemIds, selectedIds],
  );

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => toggleIdInSelection(prev, id));
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      areAllIdsSelected(ordemIds, prev) ? new Set() : new Set(ordemIds),
    );
  }, [ordemIds]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    selectedCount,
    allSelected,
    someSelected: selectedCount > 0,
    isSelected,
    toggle,
    toggleAll,
    clear,
  };
}
