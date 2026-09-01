'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
    const res = await fetch(url);
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

export function usePainelEtapaTvCarga(
  config: PainelEtapaTvConfig,
  selectedDate: string,
  setSelectedDate: (date: string) => void,
) {
  const initialDateResolved = useRef(false);
  const [fluxo, setFluxo] = useState<VpFluxoPayload | null>(null);
  const [ordens, setOrdens] = useState<PainelOrdemEtapa[] | null>(null);
  const [pedidos, setPedidos] = useState<PainelPedidoEmbalagem[] | null>(null);
  const [dashboardDia, setDashboardDia] = useState<Array<{ assadeiras: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [fluxoErro, setFluxoErro] = useState<string | null>(null);
  const [etapaErro, setEtapaErro] = useState<string | null>(null);

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
      const date = encodeURIComponent(selectedDate);
      const [fluxoRes, etapaRes] = await Promise.all([
        fetchLeg<CargaFluxoProcessoResponse>(
          `/api/painel/fluxo-processo/carga?date=${date}`,
          'Não foi possível carregar o fluxo',
        ),
        fetchLeg<CargaEtapaResponse | CargaEmbalagemResponse>(
          `/api/painel/${config.id}/carga?date=${date}`,
          'Não foi possível carregar as OPs da etapa',
        ),
      ]);

      if (!initialDateResolved.current) {
        const ultima =
          (etapaRes.ok ? etapaRes.data.ultimaDataComDados : null) ??
          (fluxoRes.ok ? fluxoRes.data.ultimaDataComDados : null);
        if (ultima && ultima !== selectedDate) {
          initialDateResolved.current = true;
          setSelectedDate(ultima);
          if (showSpinner) setLoading(false);
          return;
        }
        initialDateResolved.current = true;
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

  useEffect(() => {
    const interval = setInterval(() => {
      void loadCarga(false);
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadCarga]);

  return {
    fluxo,
    ordens,
    pedidos,
    dashboardDia,
    loading,
    fluxoErro,
    etapaErro,
    reload: () => void loadCarga(true),
  };
}
