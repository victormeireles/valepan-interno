'use client';

import { useId, useState } from 'react';
import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtCellShort, fmtQty, fmtQtyK } from './fluxo-display-scale';
import FluxoBarrasHoraTooltip from './FluxoBarrasHoraTooltip';
import { FluxoHoraLegendaBuilder } from './FluxoHoraLegendaBuilder';
import {
  diaAnteriorLabelFromDia,
  FLUXO_UI_ETAPA_COR,
  rotuloAssadeira,
} from './fluxo-processo-format';

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const CHART_H = 210;
const LABEL_H = 16;
const legendaBuilder = new FluxoHoraLegendaBuilder();

type FluxoBarrasHoraProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaKey;
};

/**
 * Barras empilhadas por hora.
 * Total vai no rótulo acima da barra; detalhe da legenda no tooltip da hora.
 */
export default function FluxoBarrasHora({ fluxo, etapa }: FluxoBarrasHoraProps) {
  const { scale } = useFluxoDisplay();
  const chartId = useId();
  const [horaAtiva, setHoraAtiva] = useState<number | null>(null);

  const m = fluxo.matriz[etapa];
  const usadas = fluxo.ordemAss.filter((a) => (m[a] ?? []).some((v) => v > 0));
  const temAnt = fluxo.ordemAss.some((a) =>
    (fluxo.matrizAnt[etapa][a] ?? []).some((v) => v > 0),
  );
  const totais = HORAS.map((h) => scale.horaTotal(etapa, h));
  const maxHora = scale.maxHoraComum();
  const cap = scale.capacidade(etapa);
  const cor = FLUXO_UI_ETAPA_COR[etapa];
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);
  const plotH = CHART_H - LABEL_H;

  const itensAtivos =
    horaAtiva == null
      ? []
      : legendaBuilder.build(fluxo.cores, usadas, scale, etapa, horaAtiva);

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap gap-3.5">
        {usadas.map((a) => (
          <span
            key={a}
            className="inline-flex items-center gap-1.5 text-[11px] text-text-body"
          >
            <span
              className="h-[9px] w-2.5 rounded-[2px]"
              style={{ background: fluxo.cores[a] }}
              aria-hidden
            />
            {rotuloAssadeira(a)}
          </span>
        ))}
        {temAnt ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
            <span
              className="h-[9px] w-3 rounded-[2px]"
              style={{
                background:
                  'repeating-linear-gradient(45deg, var(--stone-500) 0 3px, var(--stone-300) 3px 7px)',
              }}
              aria-hidden
            />
            hachurado = OP de {antLabel}
          </span>
        ) : null}
      </div>

      <div className="flex">
        <div className="relative w-[46px] shrink-0" style={{ height: CHART_H }}>
          {[0, 0.5, 1].map((f) => (
            <span
              key={f}
              className="absolute right-2 font-mono text-[9.5px] tabular-nums text-text-faint"
              style={{ top: LABEL_H + plotH - f * plotH - 6 }}
            >
              {fmtQtyK(maxHora * f, scale.mode)}
            </span>
          ))}
        </div>

        <div
          className="relative flex-1 border-b border-border-default"
          style={{ height: CHART_H }}
          role="list"
          aria-label="Produção por hora"
          onMouseLeave={() => setHoraAtiva(null)}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <div
              key={f}
              className="absolute right-0 left-0 border-t border-stone-100"
              style={{ bottom: f * plotH }}
            />
          ))}

          {cap <= maxHora ? (
            <div
              className="absolute right-0 left-0"
              style={{ bottom: (cap / maxHora) * plotH, borderTop: `1px dashed ${cor}` }}
            >
              <span
                className="absolute top-[-13px] right-0.5 font-mono text-[9.5px] tabular-nums"
                style={{ color: cor }}
              >
                capacidade informada {fmtQtyK(cap, scale.mode)}/h
              </span>
            </div>
          ) : null}

          {horaAtiva != null ? (
            <FluxoBarrasHoraTooltip
              hora={horaAtiva}
              total={totais[horaAtiva]}
              unitLabel={scale.unitLabel}
              mode={scale.mode}
              itens={itensAtivos}
            />
          ) : null}

          <div className="absolute inset-x-0 bottom-0 flex items-end" style={{ height: plotH }}>
            {HORAS.map((h) => {
              const total = totais[h];
              const barH = maxHora > 0 ? (total / maxHora) * plotH : 0;
              const ativa = horaAtiva === h;
              const labelId = `${chartId}-hora-${h}`;

              return (
                <button
                  key={h}
                  type="button"
                  role="listitem"
                  id={labelId}
                  aria-label={
                    total > 0
                      ? `${String(h).padStart(2, '0')}:00, ${fmtQty(total, scale.mode)} ${scale.unitLabel}`
                      : `${String(h).padStart(2, '0')}:00, sem apontamento`
                  }
                  onMouseEnter={() => setHoraAtiva(h)}
                  onFocus={() => setHoraAtiva(h)}
                  onBlur={() => setHoraAtiva((cur) => (cur === h ? null : cur))}
                  className={[
                    'relative flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end border-none bg-transparent px-0.5',
                    'transition-colors duration-150 ease-out',
                    ativa ? 'bg-amber-50/70' : 'hover:bg-stone-50',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-500',
                  ].join(' ')}
                >
                  {total > 0 ? (
                    <span
                      className={[
                        'pointer-events-none absolute left-0 right-0 text-center font-mono text-[9px] font-semibold tabular-nums',
                        ativa ? 'text-text-strong' : 'text-text-muted',
                      ].join(' ')}
                      style={{ bottom: Math.max(barH + 2, 2) }}
                    >
                      {fmtCellShort(total, scale.mode)}
                    </span>
                  ) : null}

                  <div className="flex w-full flex-col" style={{ height: barH || undefined }}>
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
            })}
          </div>
        </div>
      </div>

      <div className="flex pl-[46px]">
        {HORAS.map((h) => (
          <div
            key={h}
            className={[
              'flex-1 pt-1.5 text-center font-mono text-[9px] tabular-nums',
              totais[h] ? 'text-text-muted' : 'text-text-faint',
              horaAtiva === h ? 'font-bold text-text-strong' : '',
            ].join(' ')}
          >
            {String(h).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  );
}
