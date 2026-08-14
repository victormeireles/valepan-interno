'use client';

import { FluxoOndaSegmentoOpAnteriorSplitter } from '@/domain/fluxo-processo/fluxo-ondas-contexto';
import type {
  FluxoEtapaKey,
  FluxoOndaAssadeira,
  FluxoOndaSegmento,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { fmtQty, type FluxoDisplayMode } from './fluxo-display-scale';
import { FLUXO_UI_ETAPA_COR } from './fluxo-processo-format';

const COR_OUTRA_ONDA = '#A8A29E';
const COR_CONTEXTO = '#D6D3D1';
const opAnteriorSplitter = new FluxoOndaSegmentoOpAnteriorSplitter();

export function faixaHorasOnda(ini: number | null, fim: number | null): string {
  if (ini == null || fim == null) return '—';
  if (ini === fim) return `${String(ini).padStart(2, '0')}h`;
  return `${String(ini).padStart(2, '0')}–${String(fim).padStart(2, '0')}h`;
}

function hatchBg(base: string): string {
  return `repeating-linear-gradient(45deg, ${base} 0 3px, color-mix(in srgb, ${base} 30%, white) 3px 7px)`;
}

type FluxoOndasGraficoProps = {
  ondas: FluxoOndaAssadeira[];
  selectedId: string;
  corAssadeira: string;
  contexto: Record<FluxoEtapaKey, FluxoOndaSegmento[]>;
  embOpAnteriorHoras: number[];
  antLabel: string;
  unitLabel: string;
  mode: FluxoDisplayMode;
  fromUn: (un: number) => number;
  onSelect: (ondaId: string) => void;
};

type LayerKind = 'contexto' | 'outra' | 'selecionada';

type LayerSeg = {
  key: string;
  ondaId: string | null;
  segmento: FluxoOndaSegmento;
  kind: LayerKind;
  corEtapa: string;
  opAnterior: boolean;
};

/**
 * Trilhos Ferm/Forno/Emb com todas as ondas da assadeira.
 * Selecionada colorida; demais cinza; contexto cinza suave;
 * emb de OP anterior hachurado (igual produção por hora).
 */
export default function FluxoOndasGrafico({
  ondas,
  selectedId,
  corAssadeira,
  contexto,
  embOpAnteriorHoras,
  antLabel,
  unitLabel,
  mode,
  fromUn,
  onSelect,
}: FluxoOndasGraficoProps) {
  const temAnt = embOpAnteriorHoras.some((v) => v > 0);
  const etapas: { key: FluxoEtapaKey; label: string }[] = [
    { key: 'ferm', label: 'Ferm' },
    { key: 'forno', label: 'Forno' },
    { key: 'emb', label: 'Emb' },
  ];

  return (
    <div className="space-y-1.5">
      {etapas.map(({ key, label }) => (
        <TrilhoUnificado
          key={key}
          label={label}
          layers={buildLayers(
            key,
            ondas,
            selectedId,
            contexto[key],
            key === 'emb' ? embOpAnteriorHoras : null,
          )}
          corAssadeira={corAssadeira}
          unitLabel={unitLabel}
          mode={mode}
          fromUn={fromUn}
          onSelect={onSelect}
        />
      ))}
      <div className="flex justify-between gap-0 pl-[40px] font-mono text-[8px] tabular-nums text-text-faint">
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="min-w-0 flex-1 text-center">
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
      <LegendaCores temAnt={temAnt} antLabel={antLabel} />
    </div>
  );
}

function buildLayers(
  etapa: FluxoEtapaKey,
  ondas: FluxoOndaAssadeira[],
  selectedId: string,
  contextoSegs: FluxoOndaSegmento[],
  antHoras: number[] | null,
): LayerSeg[] {
  const layers: LayerSeg[] = [];

  for (const s of contextoSegs) {
    pushSplit(
      layers,
      s,
      null,
      'contexto',
      COR_CONTEXTO,
      `ctx-${etapa}`,
      antHoras,
    );
  }

  for (const onda of ondas) {
    const segs = segsEtapa(etapa, onda);
    const kind: LayerKind =
      onda.id === selectedId ? 'selecionada' : 'outra';
    const cor =
      kind === 'selecionada' ? FLUXO_UI_ETAPA_COR[etapa] : COR_OUTRA_ONDA;
    for (const s of segs) {
      pushSplit(
        layers,
        s,
        onda.id,
        kind,
        cor,
        `${onda.id}-${etapa}`,
        antHoras,
      );
    }
  }

  return layers;
}

function pushSplit(
  layers: LayerSeg[],
  seg: FluxoOndaSegmento,
  ondaId: string | null,
  kind: LayerKind,
  corEtapa: string,
  keyPrefix: string,
  antHoras: number[] | null,
) {
  const parts = antHoras
    ? opAnteriorSplitter.split(seg, antHoras)
    : [{ segmento: seg, opAnterior: false }];

  for (const p of parts) {
    layers.push({
      key: `${keyPrefix}-${p.segmento.ini}-${p.segmento.fim}-${p.opAnterior ? 'ant' : 'dia'}`,
      ondaId,
      segmento: p.segmento,
      kind,
      corEtapa,
      opAnterior: p.opAnterior,
    });
  }
}

function segsEtapa(
  etapa: FluxoEtapaKey,
  onda: FluxoOndaAssadeira,
): FluxoOndaSegmento[] {
  if (etapa === 'ferm') {
    return [
      {
        ini: onda.fermIniHora,
        fim: onda.fermFimHora,
        volumeUn: onda.volumeUn,
      },
    ];
  }
  if (etapa === 'forno') return onda.fornoSegmentos;
  return onda.embSegmentos;
}

function TrilhoUnificado({
  label,
  layers,
  corAssadeira,
  unitLabel,
  mode,
  fromUn,
  onSelect,
}: {
  label: string;
  layers: LayerSeg[];
  corAssadeira: string;
  unitLabel: string;
  mode: FluxoDisplayMode;
  fromUn: (un: number) => number;
  onSelect: (ondaId: string) => void;
}) {
  const ordered = [...layers].sort((a, b) => zOf(a.kind) - zOf(b.kind));

  return (
    <div className="flex items-center gap-2">
      <div className="w-[40px] shrink-0 text-right text-[10px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="relative h-8 min-w-0 flex-1 rounded-lg bg-stone-100">
        {ordered.length === 0 ? (
          <div className="absolute inset-0 flex items-center px-2 text-[10px] text-text-faint">
            —
          </div>
        ) : (
          ordered.map((layer) => (
            <SegmentoLayer
              key={layer.key}
              layer={layer}
              corAssadeira={corAssadeira}
              showLabel={layer.kind === 'selecionada'}
              unitLabel={unitLabel}
              mode={mode}
              fromUn={fromUn}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

function zOf(kind: LayerKind): number {
  if (kind === 'contexto') return 1;
  if (kind === 'outra') return 2;
  return 3;
}

function SegmentoLayer({
  layer,
  corAssadeira,
  showLabel,
  unitLabel,
  mode,
  fromUn,
  onSelect,
}: {
  layer: LayerSeg;
  corAssadeira: string;
  showLabel: boolean;
  unitLabel: string;
  mode: FluxoDisplayMode;
  fromUn: (un: number) => number;
  onSelect: (ondaId: string) => void;
}) {
  const { segmento: s, kind, ondaId, corEtapa, opAnterior } = layer;
  const spanH = s.fim - s.ini + 1;
  const leftPct = (s.ini / 24) * 100;
  const widthPct = (spanH / 24) * 100;
  const vol = fromUn(s.volumeUn);
  const volTxt = `${fmtQty(vol, mode)} ${unitLabel}`;
  const faixa = faixaHorasOnda(s.ini, s.fim);

  const solid =
    kind === 'selecionada'
      ? `color-mix(in srgb, ${corEtapa} 78%, ${corAssadeira})`
      : kind === 'outra'
        ? COR_OUTRA_ONDA
        : COR_CONTEXTO;
  const bg = opAnterior ? hatchBg(solid) : solid;

  const textColor = kind === 'contexto' ? '#57534E' : '#fff';
  const z = zOf(kind);
  const clickable = ondaId != null;
  const antSuffix = opAnterior ? ', OP anterior' : '';

  return (
    <>
      <button
        type="button"
        disabled={!clickable}
        onClick={() => {
          if (ondaId) onSelect(ondaId);
        }}
        aria-label={`${faixa}, ${volTxt}${antSuffix}`}
        className="absolute top-0.5 bottom-0.5 flex items-center justify-center overflow-hidden rounded-md px-1 disabled:cursor-default"
        style={{
          left: `${leftPct}%`,
          width: `${Math.max(widthPct, 2.2)}%`,
          background: bg,
          color: textColor,
          zIndex: z,
          cursor: clickable ? 'pointer' : 'default',
        }}
      >
        {showLabel ? (
          <span className="truncate font-mono text-[10px] font-bold tabular-nums leading-none">
            {volTxt}
          </span>
        ) : null}
      </button>
      {showLabel ? (
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold tabular-nums text-text-strong"
          style={{
            left: `calc(${leftPct + widthPct}% + 4px)`,
            zIndex: z + 1,
          }}
        >
          {faixa}
        </div>
      ) : null}
    </>
  );
}

function LegendaCores({
  temAnt,
  antLabel,
}: {
  temAnt: boolean;
  antLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 pl-[40px] pt-1 text-[10px] text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: FLUXO_UI_ETAPA_COR.ferm }}
          aria-hidden
        />
        Onda selecionada
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: COR_OUTRA_ONDA }}
          aria-hidden
        />
        Outras ondas
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: COR_CONTEXTO }}
          aria-hidden
        />
        Demais produção
      </span>
      {temAnt ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-3 rounded-sm"
            style={{
              background: hatchBg('var(--stone-500, #78716c)'),
            }}
            aria-hidden
          />
          hachurado = OP de {antLabel}
        </span>
      ) : null}
    </div>
  );
}
