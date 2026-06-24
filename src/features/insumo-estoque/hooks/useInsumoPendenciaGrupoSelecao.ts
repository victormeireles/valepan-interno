'use client';

import { useCallback, useMemo, useState } from 'react';
import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';

export function useInsumoPendenciaGrupoSelecao(grupos: InsumoPendenciaProdutoGrupo[]) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const visibleKeys = useMemo(() => grupos.map((grupo) => grupo.chave), [grupos]);

  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.has(key));

  const someVisibleSelected = visibleKeys.some((key) => selectedKeys.has(key));

  const toggleSelect = useCallback((chave: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedKeys((current) => {
      if (allVisibleSelected) {
        const next = new Set(current);
        visibleKeys.forEach((key) => next.delete(key));
        return next;
      }
      const next = new Set(current);
      visibleKeys.forEach((key) => next.add(key));
      return next;
    });
  }, [allVisibleSelected, visibleKeys]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const removeFromSelection = useCallback((chaves: string[]) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      chaves.forEach((chave) => next.delete(chave));
      return next;
    });
  }, []);

  const selectedPendenciaCount = useMemo(
    () =>
      grupos
        .filter((grupo) => selectedKeys.has(grupo.chave))
        .reduce((sum, grupo) => sum + grupo.pendenciaCount, 0),
    [grupos, selectedKeys],
  );

  return {
    selectedKeys,
    selectedGrupoCount: selectedKeys.size,
    selectedPendenciaCount,
    allVisibleSelected,
    someVisibleSelected,
    toggleSelect,
    toggleSelectAllVisible,
    clearSelection,
    removeFromSelection,
  };
}
