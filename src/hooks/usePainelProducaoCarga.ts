'use client';

import { useCallback, useRef, useState } from 'react';
import type { CargaPainelProducaoResponse, PainelProducaoData } from '@/domain/painel-producao/painel-producao-types';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export function usePainelProducaoCarga() {
  const initialDateResolved = useRef(false);
  const [painel, setPainel] = useState<PainelProducaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const applyResponse = useCallback(
    (data: CargaPainelProducaoResponse, currentDate: string, setDate: (date: string) => void) => {
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
      setPainel(data.painel);
    },
    [],
  );

  const loadCarga = useCallback(
    async (date: string, setDate: (value: string) => void, showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(`/api/painel/producao/carga?date=${encodeURIComponent(date)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        applyResponse(data as CargaPainelProducaoResponse, date, setDate);
      } catch (error) {
        if (showSpinner) {
          setMessage(getVisibleErrorMessage(error, 'Erro ao carregar o painel de produção'));
        } else {
          console.error('Erro ao recarregar painel de produção:', error);
        }
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [applyResponse],
  );

  return {
    painel,
    loading,
    refreshing,
    message,
    setMessage,
    loadCarga,
    initialDateResolved,
  };
}

export function usePainelProducaoDateState() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());
  return { selectedDate, setSelectedDate };
}
