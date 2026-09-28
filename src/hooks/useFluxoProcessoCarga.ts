'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  CargaFluxoProcessoResponse,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { PAINEL_FETCH_INIT, PainelCargaRequest } from '@/lib/painel/painel-fetch';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export function useFluxoProcessoCarga() {
  const abortRef = useRef<AbortController | null>(null);
  const inflightRef = useRef(false);
  const preferUltimaRef = useRef(true);
  const [fluxo, setFluxo] = useState<VpFluxoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadCarga = useCallback(
    async (date: string, showSpinner: boolean): Promise<string | null> => {
      if (!showSpinner && inflightRef.current) return null;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      inflightRef.current = true;
      const preferUltima = preferUltimaRef.current;
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(
          PainelCargaRequest.url('/api/painel/fluxo-processo/carga', date, Date.now(), {
            preferUltima,
          }),
          { ...PAINEL_FETCH_INIT, signal: controller.signal },
        );
        const data = await res.json();
        if (controller.signal.aborted) return null;
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar fluxo do processo');
        const carga = data as CargaFluxoProcessoResponse;
        setFluxo(carga.fluxo);
        setMessage(null);
        preferUltimaRef.current = false;
        return carga.date;
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return null;
        if (showSpinner) {
          setMessage(getVisibleErrorMessage(error, 'Erro ao carregar o fluxo do processo'));
        } else {
          console.error('Erro ao recarregar fluxo do processo:', error);
        }
        return null;
      } finally {
        if (abortRef.current === controller) {
          inflightRef.current = false;
          abortRef.current = null;
          if (showSpinner) setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  const markLoading = useCallback(() => {
    setLoading(true);
  }, []);

  return {
    fluxo,
    loading,
    refreshing,
    message,
    loadCarga,
    markLoading,
  };
}

export function useFluxoProcessoDateState() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());
  return { selectedDate, setSelectedDate };
}
