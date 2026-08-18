'use client';

import { useMemo, useState } from 'react';
import { pageShellPaddingX } from '@/components/ui/page-shell';
import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { FluxoDisplayContext } from './fluxo-display-context';
import { FluxoDisplayScale, type FluxoDisplayMode } from './fluxo-display-scale';
import FluxoEtapaCards from './FluxoEtapaCards';
import FluxoFilasPanel from './FluxoFilasPanel';
import FluxoPercursoSection from './FluxoPercursoSection';
import FluxoProcessoHeader from './FluxoProcessoHeader';
import FluxoProducaoPorHora from './FluxoProducaoPorHora';

type FluxoProcessoScreenProps = {
  fluxo: VpFluxoPayload;
  selectedDate: string;
  onDateChange: (date: string) => void;
};

export default function FluxoProcessoScreen({
  fluxo,
  selectedDate,
  onDateChange,
}: FluxoProcessoScreenProps) {
  const [mode, setMode] = useState<FluxoDisplayMode>('lt');
  const scale = useMemo(() => new FluxoDisplayScale(fluxo, mode), [fluxo, mode]);

  return (
    <FluxoDisplayContext.Provider value={{ mode, setMode, scale }}>
      <FluxoProcessoScreenBody
        fluxo={fluxo}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />
    </FluxoDisplayContext.Provider>
  );
}

function FluxoProcessoScreenBody({
  fluxo,
  selectedDate,
  onDateChange,
}: FluxoProcessoScreenProps) {
  const [etapa, setEtapa] = useState<FluxoEtapaKey>('ferm');
  const [ass, setAss] = useState(fluxo.ordemAss[0] ?? 'N/A');

  const activeAss = fluxo.ordemAss.includes(ass) ? ass : (fluxo.ordemAss[0] ?? 'N/A');

  return (
    <div className="w-full">
      <FluxoProcessoHeader
        diaLabel={fluxo.diaLabel}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />

      <div
        className={[
          'mx-auto grid w-full max-w-[1360px] gap-3.5 pt-4 pb-14',
          pageShellPaddingX,
        ].join(' ')}
      >
        <FluxoEtapaCards fluxo={fluxo} etapaAtiva={etapa} onSelect={setEtapa} />

        <FluxoFilasPanel fluxo={fluxo} />

        <FluxoProducaoPorHora fluxo={fluxo} etapa={etapa} onEtapaChange={setEtapa} />

        <FluxoPercursoSection fluxo={fluxo} ass={activeAss} onAssChange={setAss} />
      </div>
    </div>
  );
}
