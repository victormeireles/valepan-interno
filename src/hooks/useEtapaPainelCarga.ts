'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ordensToDashboardItems,
  snapshotsToDashboardItems,
} from '@/domain/producao-etapa/painel-dashboard-adapter';
import type {
  EtapaDashboardSnapshot,
  PainelOrdemEtapa,
} from '@/domain/types/painel-etapa';
import { addCalendarDaysISO, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

type EtapaPainelCargaResponse = {
  ordens: PainelOrdemEtapa[];
  ultimaDataComDados: string | null;
  comparacaoSemana: { date: string; items: EtapaDashboardSnapshot[] };
  comparacaoAnterior: { date: string | null; items: EtapaDashboardSnapshot[] };
};

type UseEtapaPainelCargaOptions = {
  etapa: 'fermentacao' | 'forno';
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  producaoModalOpen: boolean;
};

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export function useEtapaPainelCarga({
  etapa,
  selectedDate,
  setSelectedDate,
  producaoModalOpen,
}: UseEtapaPainelCargaOptions) {
  const initialDateResolved = useRef(false);
  const [ordens, setOrdens] = useState<PainelOrdemEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [comparisonWeekItems, setComparisonWeekItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [comparisonPrevItems, setComparisonPrevItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [comparisonWeekDate, setComparisonWeekDate] = useState(() =>
    addCalendarDaysISO(getTodayISOInBrazilTimezone(), -7),
  );
  const [dateComparisonPrev, setDateComparisonPrev] = useState<string | null>(null);

  const applyCargaResponse = useCallback(
    (data: EtapaPainelCargaResponse, currentDate: string) => {
      if (
        !initialDateResolved.current &&
        data.ultimaDataComDados &&
        data.ultimaDataComDados !== currentDate
      ) {
        initialDateResolved.current = true;
        setSelectedDate(data.ultimaDataComDados);
        return;
      }

      initialDateResolved.current = true;
      setOrdens(data.ordens);
      setComparisonWeekDate(data.comparacaoSemana.date);
      setComparisonWeekItems(snapshotsToDashboardItems(data.comparacaoSemana.items));
      setComparisonPrevItems(snapshotsToDashboardItems(data.comparacaoAnterior.items));
      setDateComparisonPrev(data.comparacaoAnterior.date);
    },
    [setSelectedDate],
  );

  const loadCarga = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(`/api/painel/${etapa}/carga?date=${selectedDate}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        applyCargaResponse(data as EtapaPainelCargaResponse, selectedDate);
      } catch (err) {
        if (showSpinner) {
          setMessage(getVisibleErrorMessage(err, 'Erro ao carregar o painel'));
        } else {
          console.error(`Erro ao recarregar carga ${etapa}:`, err);
        }
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [applyCargaResponse, etapa, selectedDate],
  );

  const refreshOrdensOnly = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/painel/${etapa}?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
      setOrdens((data.ordens || []) as PainelOrdemEtapa[]);
    } catch (err) {
      console.error(`Erro ao recarregar ordens ${etapa}:`, err);
    } finally {
      setRefreshing(false);
    }
  }, [etapa, selectedDate]);

  useEffect(() => {
    void loadCarga(true);
  }, [loadCarga]);

  useEffect(() => {
    if (producaoModalOpen) return;
    const interval = setInterval(() => void refreshOrdensOnly(), 60_000);
    return () => clearInterval(interval);
  }, [producaoModalOpen, refreshOrdensOnly]);

  const dashboardItems = useMemo(() => ordensToDashboardItems(ordens), [ordens]);

  return {
    ordens,
    loading,
    refreshing,
    message,
    setMessage,
    dashboardItems,
    dashboardPrev: comparisonPrevItems,
    dashboardWeek: comparisonWeekItems,
    comparisonWeekDate,
    dateComparisonPrev,
    refreshOrdensOnly,
  };
}
