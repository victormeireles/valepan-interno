'use client';

import { useCallback, useRef, useState } from 'react';
import { getInsumoNotasPorProdutoOmie } from '@/app/actions/insumo-nf-consulta-actions';
import type { InsumoNfDetalhe } from '@/domain/insumos/insumo-nf-detalhe';
import {
  buildNfsTargetCacheKey,
  type InsumoPendenciaNfsTarget,
} from '@/domain/insumos/insumo-pendencia-nfs-target';

type LoadState = {
  detalhes: InsumoNfDetalhe[];
  loading: boolean;
  error: string | null;
};

const initialState: LoadState = {
  detalhes: [],
  loading: false,
  error: null,
};

export function useInsumoNfConsultaQuery() {
  const cacheRef = useRef(new Map<string, InsumoNfDetalhe[]>());
  const [state, setState] = useState<LoadState>(initialState);

  const load = useCallback(
    async (target: InsumoPendenciaNfsTarget, periodo: { de: string; ate: string }) => {
      const cacheKey = `${buildNfsTargetCacheKey(target)}:${periodo.de}:${periodo.ate}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setState({ detalhes: cached, loading: false, error: null });
        return cached;
      }

      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const detalhes = await getInsumoNotasPorProdutoOmie({
          empresaId: target.empresaId,
          omieIdProduto: target.omieIdProduto,
          statuses: target.statuses,
          insumoId: target.insumoId,
          fatorConversao: target.fatorConversao ?? 0,
          unidadeEstoque: target.unidadeEstoque,
          unidadeNfVinculo: target.unidadeNf,
          insumoNome: target.insumoNome,
          de: periodo.de,
          ate: periodo.ate,
        });
        cacheRef.current.set(cacheKey, detalhes);
        setState({ detalhes, loading: false, error: null });
        return detalhes;
      } catch {
        setState({ detalhes: [], loading: false, error: 'Erro ao carregar notas fiscais' });
        return [];
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { ...state, load, reset };
}
