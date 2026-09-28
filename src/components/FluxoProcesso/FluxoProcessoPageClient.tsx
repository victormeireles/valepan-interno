'use client';

import { useCallback, useEffect, useRef } from 'react';
import { FluxoProcessoPrimeiraCarga } from '@/components/FluxoProcesso/FluxoNumerosCarregando';
import FluxoProcessoScreen from '@/components/FluxoProcesso/FluxoProcessoScreen';
import {
  useFluxoProcessoCarga,
  useFluxoProcessoDateState,
} from '@/hooks/useFluxoProcessoCarga';
import { usePainelAutoRefresh } from '@/hooks/usePainelAutoRefresh';

export default function FluxoProcessoPageClient() {
  const { selectedDate, setSelectedDate } = useFluxoProcessoDateState();
  const { fluxo, loading, message, loadCarga, markLoading } = useFluxoProcessoCarga();
  const skipDateRef = useRef<string | null>(null);
  const handleDateChange = useCallback(
    (date: string) => {
      markLoading();
      setSelectedDate(date);
    },
    [markLoading, setSelectedDate],
  );

  useEffect(() => {
    if (skipDateRef.current === selectedDate) {
      skipDateRef.current = null;
      return;
    }
    let active = true;
    void loadCarga(selectedDate, true).then((resolved) => {
      if (!active || !resolved || resolved === selectedDate) return;
      skipDateRef.current = resolved;
      setSelectedDate(resolved);
    });
    return () => {
      active = false;
    };
  }, [loadCarga, selectedDate, setSelectedDate]);

  usePainelAutoRefresh(() => {
    void loadCarga(selectedDate, false);
  });

  if (loading && !fluxo) {
    return <FluxoProcessoPrimeiraCarga />;
  }

  if (!fluxo) {
    return (
      <div className="w-full py-16 text-center text-danger-fg">
        {message ?? 'Não foi possível carregar o fluxo do processo.'}
      </div>
    );
  }

  return (
    <>
      {message ? (
        <div className="mb-4 w-full rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">
          {message}
        </div>
      ) : null}
      <FluxoProcessoScreen
        fluxo={fluxo}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        carregandoNumeros={loading}
      />
    </>
  );
}
