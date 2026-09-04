'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PainelCargaDateFollow } from '@/domain/painel-carga/painel-carga-date-follow';
import type { PainelEtapaTvConfig } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import type {
  CargaFluxoProcessoResponse,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import type {
  CargaEmbalagemResponse,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';
import type { CargaEtapaResponse, PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { usePainelAutoRefresh } from '@/hooks/usePainelAutoRefresh';
import { PAINEL_FETCH_INIT, PainelCargaRequest } from '@/lib/painel/painel-fetch';

type FetchLegResult<T> = { ok: true; data: T } | { ok: false; error: string };

function visibleError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (/fail(?:ed)? to fetch/i.test(message)) return fallback;
  return message;
}

function errorFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const value = (body as { error: unknown }).error;
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchLeg<T>(url: string, fallback: string): Promise<FetchLegResult<T>> {
  try {
    const res = await fetch(url, PAINEL_FETCH_INIT);
    const body = await readJson(res);
    if (!res.ok) return { ok: false, error: errorFromBody(body, fallback) };
    return { ok: true, data: body as T };
  } catch (error) {
    return { ok: false, error: visibleError(error, fallback) };
  }
}

function applyFetchLeg<T>(
  res: FetchLegResult<T>,
  showSpinner: boolean,
  onOk: (data: T) => void,
  setErro: (msg: string | null) => void,
  refreshLog: string,
): void {
  if (res.ok) {
    onOk(res.data);
    setErro(null);
    return;
  }
  if (showSpinner) {
    setErro(res.error);
    return;
  }
  console.error(refreshLog, res.error);
}

function ultimaDataDaCarga(
  etapaRes: FetchLegResult<CargaEtapaResponse | CargaEmbalagemResponse>,
  fluxoRes: FetchLegResult<CargaFluxoProcessoResponse>,
): string | null {
  return (
    (etapaRes.ok ? etapaRes.data.ultimaDataComDados : null) ??
    (fluxoRes.ok ? fluxoRes.data.ultimaDataComDados : null)
  );
}

export function usePainelEtapaTvCarga(
  config: PainelEtapaTvConfig,
  selectedDate: string,
  setSelectedDate: (date: string) => void,
) {
  const userPickedDate = useRef(false);
  const [fluxo, setFluxo] = useState<VpFluxoPayload | null>(null);
  const [ordens, setOrdens] = useState<PainelOrdemEtapa[] | null>(null);
  const [pedidos, setPedidos] = useState<PainelPedidoEmbalagem[] | null>(null);
  const [dashboardDia, setDashboardDia] = useState<Array<{ assadeiras: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [fluxoErro, setFluxoErro] = useState<string | null>(null);
  const [etapaErro, setEtapaErro] = useState<string | null>(null);

  const onDateChange = useCallback(
    (date: string) => {
      userPickedDate.current = true;
      setSelectedDate(date);
    },
    [setSelectedDate],
  );

  const applyEtapa = useCallback(
    (data: CargaEtapaResponse | CargaEmbalagemResponse) => {
      if (config.id === 'embalagem') {
        const carga = data as CargaEmbalagemResponse;
        setPedidos(carga.pedidos);
        return;
      }
      const carga = data as CargaEtapaResponse;
      setOrdens(carga.ordens);
      setDashboardDia(carga.dashboardDia ?? []);
    },
    [config.id],
  );

  const loadCarga = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      const date = selectedDate;
      const [fluxoRes, etapaRes] = await Promise.all([
        fetchLeg<CargaFluxoProcessoResponse>(
          PainelCargaRequest.url('/api/painel/fluxo-processo/carga', date),
          'Não foi possível carregar o fluxo',
        ),
        fetchLeg<CargaEtapaResponse | CargaEmbalagemResponse>(
          PainelCargaRequest.url(`/api/painel/${config.id}/carga`, date),
          'Não foi possível carregar as OPs da etapa',
        ),
      ]);

      const nextDate = PainelCargaDateFollow.nextDate({
        userPickedDate: userPickedDate.current,
        ultimaDataComDados: ultimaDataDaCarga(etapaRes, fluxoRes),
        selectedDate: date,
      });
      if (nextDate) {
        setSelectedDate(nextDate);
        if (showSpinner) setLoading(false);
        return;
      }

      applyFetchLeg(
        fluxoRes,
        showSpinner,
        (data) => setFluxo(data.fluxo),
        setFluxoErro,
        'Erro ao recarregar fluxo do quadro:',
      );
      applyFetchLeg(
        etapaRes,
        showSpinner,
        applyEtapa,
        setEtapaErro,
        'Erro ao recarregar OPs do quadro:',
      );

      if (showSpinner) setLoading(false);
    },
    [applyEtapa, config.id, selectedDate, setSelectedDate],
  );

  useEffect(() => {
    void loadCarga(true);
  }, [loadCarga]);

  usePainelAutoRefresh(() => {
    void loadCarga(false);
  });

  return {
    fluxo,
    ordens,
    pedidos,
    dashboardDia,
    loading,
    fluxoErro,
    etapaErro,
    reload: () => void loadCarga(true),
    onDateChange,
  };
}
