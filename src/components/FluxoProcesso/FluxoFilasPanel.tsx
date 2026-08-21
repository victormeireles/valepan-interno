'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { FluxoFilaKey } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  extractCalendarDate,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';
import { useFluxoDisplay } from './fluxo-display-context';
import FluxoFilaDetalheList from './FluxoFilaDetalheList';
import FluxoFilaTile from './FluxoFilaTile';

type FluxoFilasPanelProps = {
  fluxo: VpFluxoPayload;
};

type FilaTileDef = {
  key: FluxoFilaKey;
  label: string;
  icon: string;
  showPrazo: boolean;
  accent?: string;
};

const TILES: FilaTileDef[] = [
  { key: 'aProduzir' as const, label: 'A produzir', icon: 'schedule', showPrazo: false },
  {
    key: 'fermentando' as const,
    label: 'Fermentando',
    icon: 'bakery_dining',
    showPrazo: true,
    accent: '#C6A848',
  },
  { key: 'resfriando' as const, label: 'Resfriando', icon: 'ac_unit', showPrazo: true },
  { key: 'embalado' as const, label: 'Embalado', icon: 'inventory_2', showPrazo: false },
  { key: 'perdas' as const, label: 'Perdas', icon: 'report', showPrazo: false },
];

const TILE_ACCENT: Record<FluxoFilaKey, string> = {
  aProduzir: '#78716C',
  fermentando: '#C6A848',
  resfriando: '#44403C',
  embalado: '#047857',
  perdas: '#BE123C',
};

class FluxoFilasSubtitle {
  static forDia(dia: string): string {
    const hoje = extractCalendarDate(dia) === getTodayISOInBrazilTimezone();
    return hoje ? 'Volume nas filas entre etapas, agora' : 'Situação ao fim do dia';
  }
}

function prazoMinDaFila(
  key: FluxoFilaKey,
  padrao: { camaraMin: number; resfrioMin: number },
): number {
  if (key === 'fermentando') return padrao.camaraMin;
  if (key === 'resfriando') return padrao.resfrioMin;
  return 0;
}

function detailIdFor(key: FluxoFilaKey): string {
  return `fluxo-fila-detalhe-${key}`;
}

function FluxoFilasTileGrid({
  filas,
  filaAberta,
  padrao,
  onToggle,
}: {
  filas: NonNullable<VpFluxoPayload['filas']>;
  filaAberta: FluxoFilaKey | null;
  padrao: { camaraMin: number; resfrioMin: number };
  onToggle: (key: FluxoFilaKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {TILES.map((tile) => {
        const resumo = filas[tile.key];
        return (
          <FluxoFilaTile
            key={tile.key}
            filaKey={tile.key}
            label={tile.label}
            icon={tile.icon}
            accentColor={tile.accent ?? TILE_ACCENT[tile.key]}
            items={resumo.items}
            presoUn={resumo.presoUn}
            showPrazo={tile.showPrazo}
            prazoMin={prazoMinDaFila(tile.key, padrao)}
            ultimoLote={resumo.ultimoLote}
            active={filaAberta === tile.key}
            onClick={() => onToggle(tile.key)}
            detailId={detailIdFor(tile.key)}
          />
        );
      })}
    </div>
  );
}

export default function FluxoFilasPanel({ fluxo }: FluxoFilasPanelProps) {
  const { scale } = useFluxoDisplay();
  const [filaAberta, setFilaAberta] = useState<FluxoFilaKey | null>(null);
  const filas = fluxo.filas;
  const tileAtivo = TILES.find((t) => t.key === filaAberta) ?? null;

  function toggleFila(key: FluxoFilaKey) {
    setFilaAberta((atual) => (atual === key ? null : key));
  }

  return (
    <Card padding="md">
      <h2 className="text-base font-bold tracking-tight text-text-strong">Pães em trânsito</h2>
      <p className="mt-0.5 text-[13px] text-text-muted">{FluxoFilasSubtitle.forDia(fluxo.dia)}</p>

      {filas == null ? (
        <p className="py-3 text-sm text-text-muted">Sem OPs para este dia.</p>
      ) : (
        <div className="mt-3">
          <FluxoFilasTileGrid
            filas={filas}
            filaAberta={filaAberta}
            padrao={fluxo.padrao}
            onToggle={toggleFila}
          />
          {tileAtivo && filas ? (
            <div id={detailIdFor(tileAtivo.key)}>
              <FluxoFilaDetalheList
                filaKey={tileAtivo.key}
                resumo={filas[tileAtivo.key]}
                label={tileAtivo.label}
                scale={scale}
                prazoMin={prazoMinDaFila(tileAtivo.key, fluxo.padrao)}
                onClose={() => setFilaAberta(null)}
              />
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
