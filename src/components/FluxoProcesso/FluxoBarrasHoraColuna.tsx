'use client';

import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { fmtCellShort, fmtQty } from './fluxo-display-scale';
import FluxoBarrasHoraAgoraMark from './FluxoBarrasHoraAgoraMark';

type FluxoBarrasHoraColunaProps = {
  h: number;
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaKey;
  scale: FluxoDisplayScale;
  usadas: string[];
  total: number;
  previsto: number;
  maxHora: number;
  plotH: number;
  ativa: boolean;
  labelId: string;
  mostrarAgora: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
};

/**
 * Uma coluna horária: fantasma previsto (z-0), stack realizado (z-[1]), marcador agora.
 */
export default function FluxoBarrasHoraColuna({
  h,
  fluxo,
  etapa,
  scale,
  usadas,
  total,
  previsto,
  maxHora,
  plotH,
  ativa,
  labelId,
  mostrarAgora,
  onActivate,
  onDeactivate,
}: FluxoBarrasHoraColunaProps) {
  const barH = maxHora > 0 ? (total / maxHora) * plotH : 0;
  const ghostH = maxHora > 0 ? (previsto / maxHora) * plotH : 0;
  const delta = total - previsto;
  const hh = String(h).padStart(2, '0');

  const ariaLabel =
    previsto > 0 || total > 0
      ? `${hh}:00, previsto ${fmtQty(previsto, scale.mode)} · realizado ${fmtQty(total, scale.mode)} · Δ ${fmtQty(delta, scale.mode)}`
      : `${hh}:00, sem apontamento`;

  return (
    <button
      type="button"
      role="listitem"
      id={labelId}
      aria-label={ariaLabel}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
      className={[
        'relative flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end border-none bg-transparent px-0.5',
        'transition-colors duration-150 ease-out',
        ativa ? 'bg-amber-50/70' : 'hover:bg-stone-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-500',
      ].join(' ')}
    >
      {previsto > 0 ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0.5 right-0.5 z-0 rounded-t-sm bg-stone-200/80"
          style={{ height: ghostH }}
          aria-hidden
        />
      ) : null}

      {mostrarAgora ? <FluxoBarrasHoraAgoraMark /> : null}

      {total > 0 ? (
        <span
          className={[
            'pointer-events-none absolute left-0 right-0 z-[1] text-center font-mono text-[9px] font-semibold tabular-nums',
            ativa ? 'text-text-strong' : 'text-text-muted',
          ].join(' ')}
          style={{ bottom: Math.max(Math.max(barH, ghostH) + 2, 2) }}
        >
          {fmtCellShort(total, scale.mode)}
        </span>
      ) : null}

      <div
        className="relative z-[1] flex w-full flex-col"
        style={{ height: barH || undefined }}
      >
        {usadas
          .slice()
          .reverse()
          .map((a) => {
            const v = scale.celula(etapa, a, h);
            if (!v) return null;
            const ant = scale.celulaAnt(etapa, a, h);
            const dia = v - ant;
            return (
              <div key={a} className="flex flex-col">
                {ant > 0 ? (
                  <div
                    style={{
                      height: (ant / maxHora) * plotH,
                      minHeight: 1,
                      background: `repeating-linear-gradient(45deg, ${fluxo.cores[a]} 0 3px, color-mix(in srgb, ${fluxo.cores[a]} 30%, white) 3px 7px)`,
                    }}
                  />
                ) : null}
                {dia > 0 ? (
                  <div
                    style={{
                      height: (dia / maxHora) * plotH,
                      minHeight: 1,
                      background: fluxo.cores[a],
                    }}
                  />
                ) : null}
              </div>
            );
          })}
      </div>
    </button>
  );
}
