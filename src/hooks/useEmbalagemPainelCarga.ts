'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { snapshotsToDashboardItems } from '@/domain/embalagem/painel-dashboard-adapter';
import {
  readTurnoCarga,
  type ProducaoTurnoCargaDto,
} from '@/domain/producao-turno/producao-turno-carga';
import type { ProducaoTurnoCadastrado } from '@/domain/producao-turno/producao-turno-types';
import type {
  DashboardSnapshot,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';
import { usePainelAutoRefresh } from '@/hooks/usePainelAutoRefresh';
import { PAINEL_FETCH_INIT, PainelCargaRequest } from '@/lib/painel/painel-fetch';
import {
  addCalendarDaysISO,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type EmbalagemPainelCargaResponse = {
  pedidos: PainelPedidoEmbalagem[];
  ultimaDataComDados: string | null;
  dashboardDia?: DashboardSnapshot[];
  comparacaoSemana: { date: string; items: DashboardSnapshot[] };
  comparacaoAnterior: { date: string | null; items: DashboardSnapshot[] };
  horarioInicioEmbalagem?: string;
} & Partial<ProducaoTurnoCargaDto>;

type UseEmbalagemPainelCargaOptions = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  producaoModalOpen: boolean;
  setMessage: (message: string | null) => void;
};

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export function useEmbalagemPainelCarga({
  selectedDate,
  setSelectedDate,
  producaoModalOpen,
  setMessage,
}: UseEmbalagemPainelCargaOptions) {
  const initialDateResolved = useRef(false);
  const [pedidos, setPedidos] = useState<PainelPedidoEmbalagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [comparisonWeekItems, setComparisonWeekItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [comparisonPrevItems, setComparisonPrevItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [comparisonWeekDate, setComparisonWeekDate] = useState<string>(() =>
    addCalendarDaysISO(getTodayISOInBrazilTimezone(), -7),
  );
  const [dateComparisonPrev, setDateComparisonPrev] = useState<string | null>(null);
  const [dashboardDiaItems, setDashboardDiaItems] = useState(
    snapshotsToDashboardItems([]),
  );
  const [turnos, setTurnos] = useState<ProducaoTurnoCadastrado[]>([]);

  const applyCargaResponse = useCallback(
    (data: EmbalagemPainelCargaResponse, currentDate: string) => {
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
      setPedidos(data.pedidos);
      const turnoCarga = readTurnoCarga(data);
      setTurnos(turnoCarga.turnos);
      setComparisonWeekDate(data.comparacaoSemana.date);
      setComparisonWeekItems(snapshotsToDashboardItems(data.comparacaoSemana.items));
      setComparisonPrevItems(snapshotsToDashboardItems(data.comparacaoAnterior.items));
      setDateComparisonPrev(data.comparacaoAnterior.date);
      setDashboardDiaItems(snapshotsToDashboardItems(data.dashboardDia ?? []));
    },
    [setSelectedDate],
  );

  const loadCargaEmbalagem = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(
          PainelCargaRequest.url('/api/painel/embalagem/carga', selectedDate),
          PAINEL_FETCH_INIT,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        applyCargaResponse(data as EmbalagemPainelCargaResponse, selectedDate);
      } catch (err) {
        if (showSpinner) {
          setMessage(getVisibleErrorMessage(err, 'Erro ao carregar o painel'));
        } else {
          console.error('Erro ao recarregar carga embalagem:', err);
        }
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [applyCargaResponse, selectedDate, setMessage],
  );

  const refreshPedidosOnly = useCallback(async (): Promise<PainelPedidoEmbalagem[]> => {
    setRefreshing(true);
    try {
      const res = await fetch(
        PainelCargaRequest.url('/api/painel/embalagem', selectedDate),
        PAINEL_FETCH_INIT,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
      const nextPedidos = (data.pedidos || []) as PainelPedidoEmbalagem[];
      setPedidos(nextPedidos);
      return nextPedidos;
    } catch (err) {
      console.error('Erro ao recarregar pedidos:', err);
      return [];
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadCargaEmbalagem(true);
  }, [selectedDate, loadCargaEmbalagem]);

  usePainelAutoRefresh(() => {
    void loadCargaEmbalagem(false);
  }, !producaoModalOpen);

  return {
    pedidos,
    loading,
    refreshing,
    dashboardDiaItems,
    comparisonWeekItems,
    comparisonPrevItems,
    comparisonWeekDate,
    dateComparisonPrev,
    turnos,
    loadCargaEmbalagem,
    refreshPedidosOnly,
  };
}
