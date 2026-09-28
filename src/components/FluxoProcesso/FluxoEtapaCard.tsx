'use client';

import { Card } from '@/components/ui/Card';
import type { FluxoEtapaResumo, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import FluxoEtapaCardComControle from './FluxoEtapaCardComControle';
import FluxoEtapaCardSemControle from './FluxoEtapaCardSemControle';
import FluxoEtapaContinuidade from './FluxoEtapaContinuidade';
import FluxoEtapaRitmoRow from './FluxoEtapaRitmoRow';
import { FluxoEtapaNumerosSkeleton } from './FluxoNumerosCarregando';
import { FLUXO_UI_ETAPA_COR, hhmm } from './fluxo-processo-format';

type FluxoEtapaCardProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaResumo;
  ativa: boolean;
  carregandoNumeros?: boolean;
  onSelect?: (key: FluxoEtapaResumo['key']) => void;
  selecionavel?: boolean;
};

export default function FluxoEtapaCard({
  fluxo,
  etapa: e,
  ativa,
  carregandoNumeros = false,
  onSelect,
  selecionavel = true,
}: FluxoEtapaCardProps) {
  const cor = FLUXO_UI_ETAPA_COR[e.key];
  const numeros =
    fluxo.controle?.disponivel === true ? fluxo.controle.etapas[e.key] : null;
  const destacado = selecionavel ? ativa : true;
  const interativo = selecionavel && !carregandoNumeros;

  return (
    <Card
      padding="md"
      className="min-w-0"
      style={
        destacado
          ? {
              border: `1px solid ${cor}`,
              boxShadow: `0 0 0 3px color-mix(in srgb, ${cor} 12%, transparent)`,
            }
          : undefined
      }
    >
      <div
        role={interativo ? 'button' : undefined}
        tabIndex={interativo ? 0 : undefined}
        aria-pressed={interativo ? ativa : undefined}
        aria-busy={carregandoNumeros || undefined}
        className={interativo ? 'min-h-11 cursor-pointer' : 'min-w-0'}
        onClick={interativo && onSelect ? () => onSelect(e.key) : undefined}
        onKeyDown={
          interativo && onSelect
            ? (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onSelect(e.key);
                }
              }
            : undefined
        }
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: cor }}
            aria-hidden
          />
          <span className="min-w-0 text-[15px] font-bold tracking-tight text-text-strong">
            {e.nome}
          </span>
          {carregandoNumeros ? null : (
            <span className="ml-auto font-mono text-[11px] tabular-nums text-text-muted">
              {hhmm(e.ini)} → {hhmm(e.fim)}
            </span>
          )}
        </div>

        {carregandoNumeros ? (
          <FluxoEtapaNumerosSkeleton />
        ) : (
          <>
            {numeros ? (
              <FluxoEtapaCardComControle
                fluxo={fluxo}
                etapa={e}
                numeros={numeros}
                cor={cor}
              />
            ) : (
              <FluxoEtapaCardSemControle fluxo={fluxo} etapa={e} />
            )}
            <FluxoEtapaRitmoRow fluxo={fluxo} etapaKey={e.key} />
          </>
        )}
      </div>

      {carregandoNumeros ? null : <FluxoEtapaContinuidade etapa={e} />}
    </Card>
  );
}
