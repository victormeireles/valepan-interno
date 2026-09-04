'use client';

import { useEffect } from 'react';
import FluxoProcessoScreen from '@/components/FluxoProcesso/FluxoProcessoScreen';
import {
  useFluxoProcessoCarga,
  useFluxoProcessoDateState,
} from '@/hooks/useFluxoProcessoCarga';
import { usePainelAutoRefresh } from '@/hooks/usePainelAutoRefresh';

export default function FluxoProcessoPageClient() {
  const { selectedDate, setSelectedDate } = useFluxoProcessoDateState();
  const { fluxo, loading, message, loadCarga } = useFluxoProcessoCarga();

  useEffect(() => {
    void loadCarga(selectedDate, setSelectedDate, true);
  }, [loadCarga, selectedDate, setSelectedDate]);

  usePainelAutoRefresh(() => {
    void loadCarga(selectedDate, setSelectedDate, false);
  });

  if (loading && !fluxo) {
    return (
      <div className="w-full py-16 text-center text-text-muted">
        Carregando fluxo do processo…
      </div>
    );
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
        onDateChange={setSelectedDate}
      />
    </>
  );
}
