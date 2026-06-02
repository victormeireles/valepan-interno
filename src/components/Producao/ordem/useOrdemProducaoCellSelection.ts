'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OrdemProducaoDiariaItemView } from '@/app/actions/producao-actions';
import {
  chavesIntervaloColuna,
  ordemCellKey,
  parseOrdemCellKey,
  somarCelulasSelecionadas,
  type OrdemCellKey,
  type OrdemSumColumn,
} from '@/lib/production/ordem-producao-cell-selection';

export type OrdemCellSelectionApi = {
  enabled: boolean;
  isSelected: (itemId: string, column: OrdemSumColumn) => boolean;
  onCellMouseDown: (e: React.MouseEvent, itemId: string, column: OrdemSumColumn) => void;
  onCellMouseEnter: (itemId: string, column: OrdemSumColumn) => void;
  onCellClick: (e: React.MouseEvent, itemId: string, column: OrdemSumColumn) => void;
  clearSelection: () => void;
  sums: { count: number; latas: number; caixas: number };
  hasSelection: boolean;
};

export function useOrdemProducaoCellSelection(
  items: OrdemProducaoDiariaItemView[],
  enabled: boolean,
): OrdemCellSelectionApi {
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const [selected, setSelected] = useState<Set<OrdemCellKey>>(() => new Set());
  const [anchor, setAnchor] = useState<OrdemCellKey | null>(null);
  const [brushing, setBrushing] = useState<{ column: OrdemSumColumn; anchorId: string } | null>(null);
  const brushMovedRef = useRef(false);

  useEffect(() => {
    setSelected(new Set());
    setAnchor(null);
    setBrushing(null);
  }, [itemIds.join('|')]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(new Set());
        setAnchor(null);
        setBrushing(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  useEffect(() => {
    if (!brushing) return;
    const onUp = () => {
      setBrushing(null);
      if (brushMovedRef.current) {
        window.setTimeout(() => {
          brushMovedRef.current = false;
        }, 0);
      }
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [brushing]);

  const applyKeys = useCallback((keys: OrdemCellKey[], mode: 'replace' | 'add' | 'toggle') => {
    setSelected((prev) => {
      const next = mode === 'replace' ? new Set<OrdemCellKey>() : new Set(prev);
      for (const k of keys) {
        if (mode === 'toggle' && next.has(k)) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }, []);

  const onCellMouseDown = useCallback(
    (e: React.MouseEvent, itemId: string, column: OrdemSumColumn) => {
      if (!enabled || e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      const key = ordemCellKey(itemId, column);
      setAnchor(key);
      brushMovedRef.current = false;
      setBrushing({ column, anchorId: itemId });
      applyKeys([key], 'replace');
    },
    [enabled, applyKeys],
  );

  const onCellMouseEnter = useCallback(
    (itemId: string, column: OrdemSumColumn) => {
      if (!enabled || !brushing || brushing.column !== column) return;
      if (itemId !== brushing.anchorId) brushMovedRef.current = true;
      const keys = chavesIntervaloColuna(itemIds, column, brushing.anchorId, itemId);
      applyKeys(keys, 'replace');
      setAnchor(ordemCellKey(itemId, column));
    },
    [enabled, brushing, itemIds, applyKeys],
  );

  const onCellClick = useCallback(
    (e: React.MouseEvent, itemId: string, column: OrdemSumColumn) => {
      if (!enabled) return;
      e.stopPropagation();
      if (brushMovedRef.current) return;
      const key = ordemCellKey(itemId, column);
      const multi = e.ctrlKey || e.metaKey;

      if (e.shiftKey && anchor) {
        const parsed = parseOrdemCellKey(anchor);
        if (parsed && parsed.column === column) {
          const keys = chavesIntervaloColuna(itemIds, column, parsed.itemId, itemId);
          applyKeys(keys, 'replace');
          setAnchor(key);
          return;
        }
      }

      if (multi) {
        applyKeys([key], 'toggle');
        setAnchor(key);
        return;
      }

      applyKeys([key], 'replace');
      setAnchor(key);
    },
    [enabled, anchor, itemIds, applyKeys, brushing],
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setAnchor(null);
    setBrushing(null);
  }, []);

  const sums = useMemo(() => somarCelulasSelecionadas(items, selected), [items, selected]);

  return {
    enabled,
    isSelected: (itemId, column) => selected.has(ordemCellKey(itemId, column)),
    onCellMouseDown,
    onCellMouseEnter,
    onCellClick,
    clearSelection,
    sums,
    hasSelection: selected.size > 0,
  };
}
