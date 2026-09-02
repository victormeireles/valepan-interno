'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { buildEmbalagemToolbarMetrics } from '@/domain/embalagem/build-embalagem-toolbar-metrics';
import {
  getPainelEtapaTvConfig,
  type PainelEtapaTvId,
} from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import { buildOrdensEtapaToolbarMetrics } from '@/domain/producao-etapa/build-etapa-toolbar-metrics';
import { ordensParaTotaisLt } from '@/domain/producao-etapa/etapa-totais-visiveis';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import PainelEtapaTvScreen from './PainelEtapaTvScreen';
import PainelEtapaTvSkeleton from './PainelEtapaTvSkeleton';
import { usePainelEtapaTvCarga } from './usePainelEtapaTvCarga';

type PainelEtapaTvPageClientProps = {
  etapa: PainelEtapaTvId;
};

export default function PainelEtapaTvPageClient({ etapa }: PainelEtapaTvPageClientProps) {
  const config = useMemo(() => getPainelEtapaTvConfig(etapa), [etapa]);
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());
  const carga = usePainelEtapaTvCarga(config, selectedDate, setSelectedDate);

  const etapaLoaded = config.id === 'embalagem' ? carga.pedidos !== null : carga.ordens !== null;
  const hasAnyData = carga.fluxo !== null || etapaLoaded;
  const bothFailed = Boolean(carga.fluxoErro && carga.etapaErro) && !hasAnyData;

  const metrics = useMemo(() => {
    if (config.id === 'embalagem') {
      return buildEmbalagemToolbarMetrics(carga.pedidos ?? []);
    }
    return buildOrdensEtapaToolbarMetrics(ordensParaTotaisLt(carga.ordens ?? []), 'LT');
  }, [config.id, carga.pedidos, carga.ordens]);

  if (carga.loading && !hasAnyData) {
    return <PainelEtapaTvSkeleton />;
  }

  if (bothFailed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-danger-fg">
          {carga.fluxoErro ?? carga.etapaErro ?? 'Não foi possível carregar o quadro.'}
        </p>
        <Button type="button" variant="primary" size="lg" className="min-h-11" onClick={carga.reload}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const partialError = carga.fluxoErro ?? carga.etapaErro;

  return (
    <>
      {partialError ? (
        <Toast
          tone="error"
          className="fixed bottom-4 left-1/2 z-50 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2"
        >
          {partialError}
        </Toast>
      ) : null}
      <PainelEtapaTvScreen
        config={config}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        metrics={metrics}
        fluxo={carga.fluxo}
        ordens={carga.ordens ?? []}
        pedidos={carga.pedidos ?? []}
      />
    </>
  );
}
