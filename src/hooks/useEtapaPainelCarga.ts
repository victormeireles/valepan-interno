'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  snapshotsToDashboardItems,
} from '@/domain/producao-etapa/painel-dashboard-adapter';
import {
  readTurnoCarga,
  type ProducaoTurnoCargaDto,
} from '@/domain/producao-turno/producao-turno-carga';
import type { ProducaoTurnoCadastrado } from '@/domain/producao-turno/producao-turno-types';
import type {
  EtapaDashboardSnapshot,
  PainelOrdemEtapa,
} from '@/domain/types/painel-etapa';
import { usePainelAutoRefresh } from '@/hooks/usePainelAutoRefresh';
import { PAINEL_FETCH_INIT, PainelCargaRequest } from '@/lib/painel/painel-fetch';
import { addCalendarDaysISO, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

type EtapaPainelCargaResponse = {
  ordens: PainelOrdemEtapa[];
  ultimaDataComDados: string | null;
  dashboardDia?: EtapaDashboardSnapshot[];
  comparacaoSemana: { date: string; items: EtapaDashboardSnapshot[] };
  comparacaoAnterior: { date: string | null; items: EtapaDashboardSnapshot[] };
} & Partial<ProducaoTurnoCargaDto>;

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
  const [dashboardItems, setDashboardItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [turnos, setTurnos] = useState<ProducaoTurnoCadastrado[]>([]);

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
      const turnoCarga = readTurnoCarga(data);
      setTurnos(turnoCarga.turnos);
      setComparisonWeekDate(data.comparacaoSemana.date);
      setComparisonWeekItems(snapshotsToDashboardItems(data.comparacaoSemana.items));
      setComparisonPrevItems(snapshotsToDashboardItems(data.comparacaoAnterior.items));
      setDateComparisonPrev(data.comparacaoAnterior.date);
      setDashboardItems(snapshotsToDashboardItems(data.dashboardDia ?? []));
    },
    [setSelectedDate],
  );

  const loadCarga = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(
          PainelCargaRequest.url(`/api/painel/${etapa}/carga`, selectedDate),
          PAINEL_FETCH_INIT,
        );
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

  const refreshOrdensOnly = useCallback(async (): Promise<PainelOrdemEtapa[]> => {
    setRefreshing(true);
    try {
      const res = await fetch(
        PainelCargaRequest.url(`/api/painel/${etapa}`, selectedDate),
        PAINEL_FETCH_INIT,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
      const nextOrdens = (data.ordens || []) as PainelOrdemEtapa[];
      setOrdens(nextOrdens);
      return nextOrdens;
    } catch (err) {
      console.error(`Erro ao recarregar ordens ${etapa}:`, err);
      return [];
    } finally {
      setRefreshing(false);
    }
  }, [etapa, selectedDate]);

  useEffect(() => {
    void loadCarga(true);
  }, [loadCarga]);

  usePainelAutoRefresh(() => {
    void loadCarga(false);
  }, !producaoModalOpen);

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
    turnos,
    refreshOrdensOnly,
  };
}
