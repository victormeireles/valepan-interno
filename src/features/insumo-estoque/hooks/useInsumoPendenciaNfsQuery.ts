'use client';

import { useCallback, useRef, useState } from 'react';
import { getInsumoPendenciasPorProdutoOmie } from '@/app/actions/insumo-estoque-actions';
import {
  buildNfsTargetCacheKey,
  type InsumoPendenciaNfsTarget,
} from '@/domain/insumos/insumo-pendencia-nfs-target';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';

type LoadState = {
  pendencias: InsumoPendenciaComEmpresa[];
  loading: boolean;
  error: string | null;
};

const initialState: LoadState = {
  pendencias: [],
  loading: false,
  error: null,
};

export function useInsumoPendenciaNfsQuery() {
  const cacheRef = useRef(new Map<string, InsumoPendenciaComEmpresa[]>());
  const [state, setState] = useState<LoadState>(initialState);

  const load = useCallback(async (target: InsumoPendenciaNfsTarget) => {
    const cacheKey = buildNfsTargetCacheKey(target);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setState({ pendencias: cached, loading: false, error: null });
      return cached;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const pendencias = await getInsumoPendenciasPorProdutoOmie({
        empresaId: target.empresaId,
        omieIdProduto: target.omieIdProduto,
        statuses: target.statuses,
      });
      cacheRef.current.set(cacheKey, pendencias);
      setState({ pendencias, loading: false, error: null });
      return pendencias;
    } catch {
      setState({ pendencias: [], loading: false, error: 'Erro ao carregar notas fiscais' });
      return [];
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { ...state, load, reset };
}
