'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  CargaFluxoProcessoResponse,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { PAINEL_FETCH_INIT, PainelCargaRequest } from '@/lib/painel/painel-fetch';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export function useFluxoProcessoCarga() {
  const initialDateResolved = useRef(false);
  const [fluxo, setFluxo] = useState<VpFluxoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const applyResponse = useCallback(
    (data: CargaFluxoProcessoResponse, currentDate: string, setDate: (date: string) => void) => {
      if (
        !initialDateResolved.current &&
        data.ultimaDataComDados &&
        data.ultimaDataComDados !== currentDate
      ) {
        initialDateResolved.current = true;
        setDate(data.ultimaDataComDados);
        return;
      }

      initialDateResolved.current = true;
      setFluxo(data.fluxo);
      setMessage(null);
    },
    [],
  );

  const loadCarga = useCallback(
    async (date: string, setDate: (value: string) => void, showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(
          PainelCargaRequest.url('/api/painel/fluxo-processo/carga', date),
          PAINEL_FETCH_INIT,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar fluxo do processo');
        applyResponse(data as CargaFluxoProcessoResponse, date, setDate);
      } catch (error) {
        if (showSpinner) {
          setMessage(getVisibleErrorMessage(error, 'Erro ao carregar o fluxo do processo'));
        } else {
          console.error('Erro ao recarregar fluxo do processo:', error);
        }
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [applyResponse],
  );

  return {
    fluxo,
    loading,
    refreshing,
    message,
    loadCarga,
  };
}

export function useFluxoProcessoDateState() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());
  return { selectedDate, setSelectedDate };
}
