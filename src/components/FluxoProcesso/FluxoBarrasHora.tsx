'use client';

import { useId, useState } from 'react';
import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { getBrazilHourMinuteNow } from '@/lib/utils/date-utils';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQtyK } from './fluxo-display-scale';
import FluxoBarrasHoraColuna from './FluxoBarrasHoraColuna';
import FluxoBarrasHoraTooltip from './FluxoBarrasHoraTooltip';
import { FluxoHoraEixo } from './fluxo-hora-eixo';
import { FluxoHoraLegendaBuilder } from './FluxoHoraLegendaBuilder';
import { FluxoJanelaGraficoCopy } from './fluxo-janela-grafico-copy';
import FluxoOverflowX from './FluxoOverflowX';
import { FluxoHoraTrack } from './fluxo-hora-track';
import { useMeasuredHeight } from './use-measured-height';
import { FLUXO_UI_ETAPA_COR, rotuloAssadeira } from './fluxo-processo-format';

const CHART_H = 210;
const LABEL_H = 16;
const legendaBuilder = new FluxoHoraLegendaBuilder();

type FluxoBarrasHoraProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaKey;
  fillHeight?: boolean;
};

/**
 * Barras empilhadas no eixo T1 + fantasma previsto e marcador agora (na janela).
 */
export default function FluxoBarrasHora({
  fluxo,
  etapa,
  fillHeight = false,
}: FluxoBarrasHoraProps) {
  const { scale } = useFluxoDisplay();
  const chartId = useId();
  const [horaAtiva, setHoraAtiva] = useState<number | null>(null);
  const plotBox = useMeasuredHeight(fillHeight, CHART_H);

  const eixo = new FluxoHoraEixo(fluxo, etapa);
  const HORAS = eixo.hoursAxis();
  const mostrarAgora = eixo.mostrarAgora();
  const horaAgora = getBrazilHourMinuteNow().hour;
  const outraOpData = fluxo.turnosResumo?.[etapa]?.outraOpData;

  const m = fluxo.matriz[etapa];
  const usadas = fluxo.ordemAss.filter((a) => (m[a] ?? []).some((v) => v > 0));
  const temAnt = fluxo.ordemAss.some((a) =>
    (fluxo.matrizAnt[etapa][a] ?? []).some((v) => v > 0),
  );
  const totais = Array.from({ length: 24 }, (_, h) => scale.horaTotal(etapa, h));
  const previstos = Array.from({ length: 24 }, (_, h) => scale.horaPrevisto(etapa, h));
  const maxHora = scale.maxHoraComum();
  const cap = scale.capacidade(etapa);
  const cor = FLUXO_UI_ETAPA_COR[etapa];
  const chartH = plotBox.height;
  const plotH = Math.max(chartH - LABEL_H, 80);

  const itensAtivos =
    horaAtiva == null
      ? []
      : legendaBuilder.build(fluxo.cores, usadas, scale, etapa, horaAtiva);

  return (
    <div className={fillHeight ? 'flex h-full min-h-0 flex-col' : undefined}>
      <FluxoBarrasHoraLegenda
        fluxo={fluxo}
        usadas={usadas}
        temAnt={temAnt}
        outraOpData={outraOpData}
        mostrarAgora={mostrarAgora}
      />

      <div className={fillHeight ? 'flex min-h-0 min-w-0 flex-1' : 'flex min-w-0'}>
        <div
          className="relative w-[46px] shrink-0 self-start"
          style={{ height: chartH }}
        >
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

        <FluxoOverflowX
          label={FluxoJanelaGraficoCopy.TITULO}
          hint={fillHeight ? '' : undefined}
          className={fillHeight ? 'min-h-0 flex-1' : 'flex-1'}
        >
          <div
            style={{ minWidth: FluxoHoraTrack.plotMinWidthPx() }}
            className={fillHeight ? 'flex h-full min-h-0 flex-col' : undefined}
          >
            <div
              ref={plotBox.ref}
              className={[
                'relative border-b border-border-default',
                fillHeight ? 'min-h-0 flex-1' : '',
              ].join(' ')}
              style={fillHeight ? undefined : { height: CHART_H }}
              role="list"
              aria-label={FluxoJanelaGraficoCopy.TITULO}
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
                    className="absolute top-[-13px] right-0.5 max-w-[70%] truncate font-mono text-[9.5px] tabular-nums"
                    style={{ color: cor }}
                  >
                    <span className="sm:hidden">cap. {fmtQtyK(cap, scale.mode)}/h</span>
                    <span className="hidden sm:inline">
                      capacidade informada {fmtQtyK(cap, scale.mode)}/h
                    </span>
                  </span>
                </div>
              ) : null}

              {horaAtiva != null ? (
                <FluxoBarrasHoraTooltip
                  hora={horaAtiva}
                  axisIndex={HORAS.indexOf(horaAtiva)}
                  total={totais[horaAtiva]}
                  previsto={previstos[horaAtiva]}
                  unitLabel={scale.unitLabel}
                  mode={scale.mode}
                  itens={itensAtivos}
                  outraOpData={outraOpData}
                />
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex items-end" style={{ height: plotH }}>
                {HORAS.map((h) => (
                  <FluxoBarrasHoraColuna
                    key={h}
                    h={h}
                    fluxo={fluxo}
                    etapa={etapa}
                    scale={scale}
                    usadas={usadas}
                    total={totais[h]}
                    previsto={previstos[h]}
                    maxHora={maxHora}
                    plotH={plotH}
                    ativa={horaAtiva === h}
                    labelId={`${chartId}-hora-${h}`}
                    mostrarAgora={mostrarAgora && h === horaAgora}
                    onActivate={() => setHoraAtiva(h)}
                    onDeactivate={() => setHoraAtiva((cur) => (cur === h ? null : cur))}
                  />
                ))}
              </div>
            </div>

            <div className="flex">
              {HORAS.map((h) => (
                <div
                  key={h}
                  className={[
                    'min-w-11 flex-1 pt-1.5 text-center font-mono text-[9px] tabular-nums',
                    totais[h] || previstos[h] ? 'text-text-muted' : 'text-text-faint',
                    horaAtiva === h ? 'font-bold text-text-strong' : '',
                  ].join(' ')}
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        </FluxoOverflowX>
      </div>
    </div>
  );
}

type FluxoBarrasHoraLegendaProps = {
  fluxo: VpFluxoPayload;
  usadas: string[];
  temAnt: boolean;
  outraOpData: string | null | undefined;
  mostrarAgora: boolean;
};

function FluxoBarrasHoraLegenda({
  fluxo,
  usadas,
  temAnt,
  outraOpData,
  mostrarAgora,
}: FluxoBarrasHoraLegendaProps) {
  return (
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
      <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
        <span className="h-[9px] w-2.5 rounded-[2px] bg-stone-200/80" aria-hidden />
        {FluxoJanelaGraficoCopy.PREVISTO}
      </span>
      {mostrarAgora ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
          <span className="inline-block h-2.5 w-0.5 bg-amber-600" aria-hidden />
          agora
        </span>
      ) : null}
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
          {FluxoJanelaGraficoCopy.hachura(outraOpData)}
        </span>
      ) : null}
    </div>
  );
}
