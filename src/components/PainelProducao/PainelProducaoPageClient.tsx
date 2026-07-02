'use client';

import { useEffect } from 'react';
import PainelProducaoScreen from '@/components/PainelProducao/PainelProducaoScreen';
import {
  usePainelProducaoCarga,
  usePainelProducaoDateState,
} from '@/hooks/usePainelProducaoCarga';

export default function PainelProducaoPageClient() {
  const { selectedDate, setSelectedDate } = usePainelProducaoDateState();
  const { painel, loading, message, loadCarga } = usePainelProducaoCarga();

  useEffect(() => {
    void loadCarga(selectedDate, setSelectedDate, true);
  }, [loadCarga, selectedDate, setSelectedDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadCarga(selectedDate, setSelectedDate, false);
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadCarga, selectedDate, setSelectedDate]);

  if (loading && !painel) {
    return (
      <div className="w-full py-16 text-center text-text-muted">
        Carregando painel de produção…
      </div>
    );
  }

  if (!painel) {
    return (
      <div className="w-full py-16 text-center text-danger-fg">
        {message ?? 'Não foi possível carregar o painel de produção.'}
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
      <PainelProducaoScreen
        painel={painel}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
    </>
  );
}
