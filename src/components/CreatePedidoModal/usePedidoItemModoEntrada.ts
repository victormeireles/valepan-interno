'use client';

import { useCallback, useState } from 'react';

export type ModoEntradaQuantidade = 'latas' | 'unidades';

export type AssadeiraOption = {
  id: string;
  nome: string;
  unidadesPorAssadeiraEfetiva: number;
};

type AssadeiraState = {
  options: AssadeiraOption[];
  boxUnits: number | null;
  modo: ModoEntradaQuantidade;
  loading: boolean;
};

const EMPTY: AssadeiraState = {
  options: [],
  boxUnits: null,
  modo: 'latas',
  loading: false,
};

export function usePedidoItemModoEntrada() {
  const [byIndex, setByIndex] = useState<Record<number, AssadeiraState>>({});

  const resetAll = useCallback(() => setByIndex({}), []);

  const resetIndex = useCallback((index: number) => {
    setByIndex((prev) => ({ ...prev, [index]: { ...EMPTY } }));
  }, []);

  const setLoading = useCallback((index: number, loading: boolean) => {
    setByIndex((prev) => ({
      ...prev,
      [index]: { ...(prev[index] ?? EMPTY), loading },
    }));
  }, []);

  const applyAssadeirasLoaded = useCallback(
    (index: number, options: AssadeiraOption[], boxUnits: number | null) => {
      const modo: ModoEntradaQuantidade = options.length > 0 ? 'latas' : 'unidades';
      setByIndex((prev) => ({
        ...prev,
        [index]: { options, boxUnits, modo, loading: false },
      }));
      return modo;
    },
    [],
  );

  const reindexAfterRemove = useCallback((removedIndex: number) => {
    setByIndex((prev) => {
      const next: Record<number, AssadeiraState> = {};
      for (const [key, value] of Object.entries(prev)) {
        const numericKey = Number(key);
        if (numericKey < removedIndex) next[numericKey] = value;
        if (numericKey > removedIndex) next[numericKey - 1] = value;
      }
      return next;
    });
  }, []);

  const getState = useCallback(
    (index: number): AssadeiraState => byIndex[index] ?? EMPTY,
    [byIndex],
  );

  return {
    getState,
    resetAll,
    resetIndex,
    setLoading,
    applyAssadeirasLoaded,
    reindexAfterRemove,
  };
}
