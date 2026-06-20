'use client';

import { useMemo, type ReactNode } from 'react';
import RitmoCompactCard, {
  type RitmoCompactCardProps,
} from '@/components/Realizado/embalagem/RitmoCompactCard';
import {
  belowEtapaToolbarStickyTop,
} from '@/components/ui/page-shell';
import {
  getBrazilHourFromIso,
  formatWeekdayDayMonthBr,
  formatWeekdayPassadaDayMonthBr,
  getTodayISOInBrazilTimezone,
  getBrazilHourMinuteNow,
  hoursRemainingUntilClockTodayBr,
  getBrazilCalendarDateTimeFromInstant,
  brazilSevenAmUtcMs,
  getBrazilDateISOFromInstant,
  formatBrazilHourMinuteLabel,
} from '@/lib/utils/date-utils';

export type EmbalagemDashboardItem = {
  cliente: string;
  produto: string;
  produzido: number;
  aProduzir: number;
  caixas?: number;
  pacotes?: number;
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  producaoUpdatedAt?: string;
  pacoteFotoUrl?: string;
  etiquetaFotoUrl?: string;
  palletFotoUrl?: string;
};

/** Soma caixas (coluna M) por hora de Brasília em `producaoUpdatedAt`. */
function hourlyCaixasMap(items: EmbalagemDashboardItem[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const it of items) {
    const cx = it.caixas ?? 0;
    if (cx <= 0) continue;
    const h = getBrazilHourFromIso(it.producaoUpdatedAt);
    if (h === null) continue;
    m.set(h, (m.get(h) ?? 0) + cx);
  }
  return m;
}

/** Soma caixas cuja coluna Q está no intervalo [startMs, endMs] (inclusive). */
function sumCaixasEmJanela(
  items: EmbalagemDashboardItem[],
  startMs: number,
  endMs: number,
): number {
  let sum = 0;
  for (const it of items) {
    const cx = it.caixas ?? 0;
    if (cx <= 0) continue;
    const raw = it.producaoUpdatedAt?.trim();
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= startMs && t <= endMs) sum += cx;
  }
  return sum;
}

/** Maior instante (ms) de `producaoUpdatedAt` num dia civil BR; null se não houver Q válido nesse dia. */
function ultimoProducaoUpdatedAtMsNoDia(
  items: EmbalagemDashboardItem[],
  dateISO: string,
): number | null {
  let maxT = -Infinity;
  for (const it of items) {
    const raw = it.producaoUpdatedAt?.trim();
    if (!raw) continue;
    const d = new Date(raw);
    const t = d.getTime();
    if (Number.isNaN(t)) continue;
    if (getBrazilDateISOFromInstant(d) !== dateISO) continue;
    maxT = Math.max(maxT, t);
  }
  return Number.isFinite(maxT) ? maxT : null;
}

function getCaixasForHour(map: Map<number, number>, hour: number): number {
  return map.get(hour) ?? 0;
}

/** Inteiro pt-BR; zero → "-" */
function formatIntPtBrOrDash(n: number): string {
  if (n === 0) return '-';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** Soma caixas da meia-noite até o fim da faixa `hour` (inclusive). */
function cumulativeCaixasUntilHour(map: Map<number, number>, hour: number): number {
  let sum = 0;
  for (let h = 0; h <= hour; h++) {
    sum += map.get(h) ?? 0;
  }
  return sum;
}

/** Duas metades: esquerda à direita, direita à esquerda; borda no meio (substitui "|"). */
function HourAccumSplitColumns({
  left,
  right,
  inline = false,
}: {
  left: ReactNode;
  right: ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <span className="whitespace-nowrap align-baseline tabular-nums">
        <span className="border-r border-stone-200 pr-1">{left}</span>
        <span className="pl-1">{right}</span>
      </span>
    );
  }
  return (
    <div className="flex w-full min-w-0 items-baseline whitespace-nowrap tabular-nums">
      <div className="min-w-0 flex-1 basis-0 border-r border-stone-200 pr-2 text-right">{left}</div>
      <div className="min-w-0 flex-1 basis-0 pl-2 text-left">{right}</div>
    </div>
  );
}

function HourAccumColumnSubheads() {
  const subCls = 'text-[11px] font-normal leading-none text-text-muted sm:text-xs';
  return (
    <HourAccumSplitColumns
      inline
      left={<span className={subCls}>hora</span>}
      right={<span className={subCls}>acum.</span>}
    />
  );
}

function HourColumnHeader({
  title,
  emphasis = 'secondary',
}: {
  title: string;
  emphasis?: 'primary' | 'secondary';
}) {
  return (
    <div className="flex flex-col items-end gap-0.5 leading-tight">
      <span
        className={[
          'text-[13px] leading-snug sm:text-sm',
          emphasis === 'primary'
            ? 'font-semibold text-amber-800'
            : 'font-medium text-text-muted',
        ].join(' ')}
      >
        {title}
      </span>
      <HourAccumColumnSubheads />
    </div>
  );
}

function StatCompare({
  label,
  value,
  unit,
  delta,
  compact = false,
  title,
}: {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
  compact?: boolean;
  title?: string;
}) {
  if (value === null) return null;
  const up = (delta ?? 0) >= 0;
  return (
    <div
      className={[
        'flex min-w-0 items-center gap-2',
        compact ? 'py-px' : 'justify-between py-1.5',
      ].join(' ')}
    >
      <span
        title={title}
        className={[
          'min-w-0 truncate text-text-muted',
          compact ? 'flex-1 text-[10px] leading-tight' : 'text-sm',
        ].join(' ')}
      >
        {label}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1">
        <span
          className={[
            'font-mono tabular-nums text-stone-700',
            compact ? 'text-[11px]' : 'text-sm',
          ].join(' ')}
        >
          {Math.round(value)} {unit}/h
        </span>
        {delta !== null ? (
          <span
            className={[
              'inline-flex items-center font-mono font-semibold tabular-nums',
              compact ? 'text-[10px]' : 'text-xs',
              up ? 'text-success' : 'text-danger',
            ].join(' ')}
          >
            <span className="material-icons text-[12px]" aria-hidden="true">
              {up ? 'arrow_upward' : 'arrow_downward'}
            </span>
            {Math.abs(delta)}%
          </span>
        ) : null}
      </span>
    </div>
  );
}

function HourAccumPair({
  map,
  hour,
  emphasis,
}: {
  map: Map<number, number>;
  hour: number;
  emphasis: 'primary' | 'secondary';
}) {
  const cxHora = getCaixasForHour(map, hour);
  const cxAcum = cumulativeCaixasUntilHour(map, hour);
  const hourClass =
    emphasis === 'primary'
      ? 'font-semibold text-amber-800'
      : 'font-medium text-stone-700';
  const acumClass = emphasis === 'primary' ? 'text-text-muted' : 'text-stone-400';
  return (
    <div
      aria-label={`${cxHora} caixas nesta hora, ${cxAcum} caixas acumuladas até este intervalo`}
    >
      <HourAccumSplitColumns
        left={<span className={hourClass}>{formatIntPtBrOrDash(cxHora)}</span>}
        right={<span className={acumClass}>{formatIntPtBrOrDash(cxAcum)}</span>}
      />
    </div>
  );
}

/** Faixa horária no fuso BR: hora 7 → "7h–8h"; 23 → "23h–24h". */
function formatIntervaloHoraBr(hour: number): string {
  if (hour < 0 || hour > 23) return `${hour}h`;
  if (hour === 23) return '23h–24h';
  return `${hour}h–${hour + 1}h`;
}

/** Última faixa usada: 21h–22h (índice 21). Nunca usa 22h–23h (índice 22). */
const ULTIMA_FAIXA_RITMO = 21;

/**
 * Média de caixas/h no dia anterior: da hora atual até a última faixa com dado ≤21h–22h.
 * Não estende com zeros depois do último dado; não inclui faixa 22h–23h.
 */
function mediaCaixasHoraRestanteDiaAnterior(
  mapPrev: Map<number, number>,
  currentHour: number,
): number | null {
  if (currentHour < 0 || currentHour > ULTIMA_FAIXA_RITMO) return null;

  let lastWithData = -1;
  for (let h = currentHour; h <= ULTIMA_FAIXA_RITMO; h++) {
    if ((mapPrev.get(h) ?? 0) > 0) {
      lastWithData = h;
    }
  }
  if (lastWithData < 0) return null;

  let sum = 0;
  for (let h = currentHour; h <= lastWithData; h++) {
    sum += mapPrev.get(h) ?? 0;
  }
  const denom = lastWithData - currentHour + 1;
  if (denom <= 0) return null;
  const avg = sum / denom;
  return avg > 0 ? avg : null;
}

function formatCxPorHora(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  const r = Math.round(n);
  if (r < 0) return '—';
  return `${r} cx/h`;
}

function IconBars({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 20V10M10 20V4M16 20v-8M22 20V14" />
    </svg>
  );
}

function PrevisaoMetricCard({
  icon,
  title,
  children,
  className,
  headerAside,
  dense = false,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
  headerAside?: ReactNode;
  dense?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className={[
        'flex min-h-0 min-w-0 items-start gap-2 rounded-xl border border-border-default bg-surface shadow-control',
        dense ? 'px-2.5 py-2' : 'px-3 py-3',
        className ?? '',
      ].join(' ')}
    >
      <div
        className={[
          'mt-px flex shrink-0 items-center justify-center rounded-lg bg-amber-50 text-accent',
          dense ? 'h-8 w-8' : 'mt-0.5 h-11 w-11 rounded-xl',
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p
            className={[
              'min-w-0 flex-1 font-semibold uppercase tracking-wide leading-snug text-text-muted',
              dense ? 'text-[10px]' : 'text-[13px] sm:text-sm',
            ].join(' ')}
          >
            {title}
          </p>
          {headerAside != null ? (
            <div className="max-w-[min(100%,9rem)] shrink-0 text-right">{headerAside}</div>
          ) : null}
        </div>
        <div
          className={[
            'leading-snug text-stone-700',
            dense ? 'text-xs' : 'text-[13px] sm:text-[15px]',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Janela da régua: 20h → 22h (2h) em escala linear. */
const REGUA_INICIO_H = 20;
const REGUA_FIM_H = 22;

function horaDecimalNoEixo(hour: number, minute: number): number {
  return hour + minute / 60;
}

function pctNoEixo20a22(hour: number, minute: number): number {
  const t = horaDecimalNoEixo(hour, minute);
  const p = ((t - REGUA_INICIO_H) / (REGUA_FIM_H - REGUA_INICIO_H)) * 100;
  return Math.min(100, Math.max(0, p));
}

type RitmoKind =
  | { kind: 'no_prev' }
  | { kind: 'no_media' }
  | { kind: 'termina'; hour: number; minute: number }
  | { kind: 'passa_22'; resto: number; embAte22: number };

type PrevisaoRitmoRulerInput = {
  falta: number;
  taxa20: number | null;
  taxa21: number | null;
  taxa22: number | null;
  passouLimite20: boolean;
  passouLimite21: boolean;
  passouLimite22: boolean;
  ritmoAnterior: number | null;
  ritmo: RitmoKind;
};

/** Ícone régua / marcos temporais. */
function IconTimelineRuler({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19h16M7 15v4M12 11v8M17 15v4" />
      <path d="M12 5v3" />
    </svg>
  );
}

/**
 * Régua 20h–22h: grelha 3 colunas (marcas · barra · metas cx/h).
 * Vermelho cheio = não fecha até 22h no ritmo de ontem (caixas para o dia seguinte).
 */
function PrevisaoAte22Ruler({ previsao }: { previsao: PrevisaoRitmoRulerInput }) {
  const { taxa20, taxa21, taxa22, passouLimite20, passouLimite21, passouLimite22, ritmoAnterior, ritmo } =
    previsao;

  const rows = [
    { key: '20', label: '20h', passed: passouLimite20, taxa: taxa20 },
    { key: '21', label: '21h', passed: passouLimite21, taxa: taxa21 },
    { key: '22', label: '22h', passed: passouLimite22, taxa: taxa22 },
  ] as const;

  let fillPct = 0;
  let band: 'folga' | 'apertado' | 'amanha' | 'sem_estimativa' = 'sem_estimativa';
  let fimLegenda = '';

  if (ritmo.kind === 'termina') {
    const fin = horaDecimalNoEixo(ritmo.hour, ritmo.minute);
    fillPct = pctNoEixo20a22(ritmo.hour, ritmo.minute);
    if (fin < REGUA_INICIO_H) {
      fillPct = Math.max(fillPct, 7);
    }
    fimLegenda = `~${ritmo.hour}h${String(ritmo.minute).padStart(2, '0')}`;
    band = fin <= 21.5 ? 'folga' : 'apertado';
  } else if (ritmo.kind === 'passa_22') {
    fillPct = 0;
    band = 'amanha';
    fimLegenda = `${formatIntPtBrOrDash(ritmo.resto)} cx p/ amanhã`;
  } else {
    fillPct = 0;
    band = 'sem_estimativa';
    fimLegenda =
      ritmo.kind === 'no_prev' ? 'Sem dia anterior p/ estimar' : 'Sem média ontem p/ estimar';
  }

  const fillSolidClass =
    band === 'folga' ? 'bg-emerald-500' : band === 'apertado' ? 'bg-amber-500' : '';

  const { hour: nh, minute: nm } = getBrazilHourMinuteNow();
  let agoraPct: number | null = null;
  const nowDec = horaDecimalNoEixo(nh, nm);
  if (nowDec >= REGUA_INICIO_H && nowDec <= REGUA_FIM_H) {
    agoraPct = pctNoEixo20a22(nh, nm);
  }

  const tickLineClass = band === 'amanha' ? 'bg-danger/40' : 'bg-stone-300/70';

  const barAriaLabel = [
    ritmoAnterior !== null ? `Ritmo médio ontem ${Math.round(ritmoAnterior)} caixas por hora.` : '',
    band === 'sem_estimativa'
      ? 'Sem estimativa de término na régua 20h–22h.'
      : band === 'folga'
        ? `Estimativa folga: termina por volta de ${fimLegenda}.`
        : band === 'apertado'
          ? `Estimativa apertada: termina por volta de ${fimLegenda}.`
          : ritmo.kind === 'passa_22'
            ? `Não fecha até 22h no ritmo de ontem; sobra ${formatIntPtBrOrDash(ritmo.resto)} caixas para amanhã.`
            : '',
  ]
    .filter(Boolean)
    .join(' ');

  const showFillArrow =
    band !== 'sem_estimativa' && band !== 'amanha' && fillPct > 0;

  const agoraMarkerPct =
    agoraPct !== null ? Math.min(96, Math.max(4, agoraPct)) : null;
  const showAgoraMarker = agoraMarkerPct !== null && band !== 'amanha';

  const fillArrowPct =
    showFillArrow ? Math.min(99.5, Math.max(0.5, fillPct)) : fillPct;

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="sr-only">{barAriaLabel}</p>

      <div className="grid w-full min-w-0 grid-cols-3 gap-x-0 gap-y-1.5">
        {rows.map((r) => (
          <div key={`h-${r.key}`} className="min-w-0 px-1 text-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:text-[13px] leading-snug">
              {r.label}
            </span>
          </div>
        ))}

        <div className="relative col-span-3 min-w-0 overflow-x-clip px-px">
          <div
            className={`relative ${EMBALAGEM_BAR_TRACK_CLASS}`}
            role="img"
            aria-label={barAriaLabel || 'Régua de previsão 20h–22h'}
          >
            {band === 'amanha' ? (
              <div className={`${EMBALAGEM_BAR_FILL_CLASS} w-full bg-red-500`} />
            ) : (
              band !== 'sem_estimativa' &&
              fillPct > 0 &&
              fillSolidClass !== '' && (
                <div
                  className={`${EMBALAGEM_BAR_FILL_CLASS} ${fillSolidClass}`}
                  style={{ width: `${fillPct}%` }}
                />
              )
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-px top-0 z-[1] h-2.5" aria-hidden>
            <div
              className={`absolute top-0 bottom-0 left-[16.666667%] w-px -translate-x-1/2 ${tickLineClass}`}
            />
            <div className={`absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 ${tickLineClass}`} />
            <div
              className={`absolute top-0 bottom-0 left-[83.333333%] w-px -translate-x-1/2 ${tickLineClass}`}
            />
          </div>

          {showAgoraMarker && (
            <div
              className="absolute top-1/2 z-[2] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-stone-400 bg-surface shadow-sm"
              style={{ left: `${agoraMarkerPct}%` }}
              title="Agora"
            />
          )}
          {showFillArrow && (
            <div
              className="pointer-events-none absolute top-1/2 z-[2] -translate-x-[1px] -translate-y-1/2 text-stone-700 drop-shadow-sm"
              style={{ left: `${fillArrowPct}%` }}
              aria-hidden
            >
              <svg width="9" height="10" viewBox="0 0 11 12" fill="currentColor" className="-translate-x-full">
                <path d="M0 1 L11 6 L0 11 Z" />
              </svg>
            </div>
          )}
        </div>

        {rows.map((r) => (
          <div key={r.key} className="min-w-0 px-1 text-center">
            <span
              className={`text-xs tabular-nums leading-snug sm:text-[13px] ${
                r.passed ? 'text-stone-400' : 'font-medium text-text-strong'
              }`}
            >
              {r.passed ? '—' : formatCxPorHora(r.taxa)}
            </span>
          </div>
        ))}
      </div>

      {band === 'sem_estimativa' && (
        <p className="text-center text-[13px] leading-snug text-text-muted sm:text-base">{fimLegenda}</p>
      )}

      {ritmo.kind === 'termina' && (
        <p className="text-center text-[13px] text-text-muted sm:text-base">
          Estimativa{' '}
          <span
            className={`font-semibold tabular-nums ${
              band === 'folga' ? 'text-success-fg' : 'text-amber-700'
            }`}
          >
            {fimLegenda}
          </span>
        </p>
      )}
    </div>
  );
}

/** Trilho / preenchimento alinhados à barra de meta do resumo. */
const EMBALAGEM_BAR_TRACK_CLASS =
  'h-2.5 w-full max-w-full rounded-full bg-stone-100 overflow-hidden';
const EMBALAGEM_BAR_FILL_CLASS =
  'h-full max-w-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

type EmbalagemDashboardProps = {
  selectedDate: string;
  items: EmbalagemDashboardItem[];
  comparisonPrev: { date: string; items: EmbalagemDashboardItem[] } | null;
  comparisonWeek: { date: string; items: EmbalagemDashboardItem[] };
  /** Funde ritmo médio e previsão de término num único card */
  ritmoCompacto?: boolean;
};

function buildTerminoCompacto(ritmo: RitmoKind): RitmoCompactCardProps['termino'] {
  if (ritmo.kind === 'termina') {
    return {
      kind: 'hora',
      label: `~${ritmo.hour}h${String(ritmo.minute).padStart(2, '0')}`,
    };
  }
  if (ritmo.kind === 'passa_22') {
    return { kind: 'amanha', resto: ritmo.resto };
  }
  if (ritmo.kind === 'no_prev') {
    return { kind: 'indisponivel', message: 'Sem dia anterior p/ estimar' };
  }
  return { kind: 'indisponivel', message: 'Sem média ontem p/ estimar' };
}

type MediaComparacaoData = {
  mediaDia: number;
  mediaOntem: number | null;
  mediaSemana: number | null;
  ultimoRegistroLabel: string;
};

function buildRitmoCompactoProps(
  mediaComparacao: MediaComparacaoData,
  ritmo: RitmoKind | null,
  comparisonPrev: EmbalagemDashboardProps['comparisonPrev'],
): RitmoCompactCardProps {
  const deltaOntem =
    mediaComparacao.mediaOntem !== null
      ? Math.round((mediaComparacao.mediaDia / mediaComparacao.mediaOntem - 1) * 100)
      : null;

  const deltaSemana =
    mediaComparacao.mediaSemana !== null
      ? Math.round((mediaComparacao.mediaDia / mediaComparacao.mediaSemana - 1) * 100)
      : null;

  return {
    horaFimLabel: mediaComparacao.ultimoRegistroLabel,
    ritmoValor: mediaComparacao.mediaDia,
    comparacaoOntem:
      comparisonPrev && mediaComparacao.mediaOntem !== null
        ? { label: 'Ontem', valor: mediaComparacao.mediaOntem, delta: deltaOntem }
        : null,
    comparacaoSemana:
      mediaComparacao.mediaSemana !== null
        ? { label: 'Semana passada', valor: mediaComparacao.mediaSemana, delta: deltaSemana }
        : null,
    termino: ritmo ? buildTerminoCompacto(ritmo) : null,
  };
}

export default function EmbalagemDashboard({
  selectedDate,
  items,
  comparisonPrev,
  comparisonWeek,
  ritmoCompacto = false,
}: EmbalagemDashboardProps) {
  const totais = useMemo(() => {
    const totalCaixasProduzido = items.reduce((sum, item) => sum + (item.caixas || 0), 0);
    const totalCaixasMeta = items.reduce((sum, item) => sum + (item.pedidoCaixas || 0), 0);
    return {
      faltaEmbalarCx: Math.max(0, totalCaixasMeta - totalCaixasProduzido),
    };
  }, [items]);

  const mapD = useMemo(() => hourlyCaixasMap(items), [items]);
  const mapPrev = useMemo(
    () => (comparisonPrev ? hourlyCaixasMap(comparisonPrev.items) : new Map<number, number>()),
    [comparisonPrev],
  );
  const mapWeek = useMemo(() => hourlyCaixasMap(comparisonWeek.items), [comparisonWeek.items]);

  /** Horas em que pelo menos um dos três dias (filtro, dia anterior, D-7) teve caixas > 0. */
  const hoursUnion = useMemo(() => {
    const s = new Set<number>();
    const collect = (m: Map<number, number>) => {
      for (const [h, cx] of m) {
        if (cx > 0) s.add(h);
      }
    };
    collect(mapD);
    collect(mapPrev);
    collect(mapWeek);
    return [...s].sort((a, b) => a - b);
  }, [mapD, mapPrev, mapWeek]);

  const caixasSemHorario = useMemo(() => {
    let n = 0;
    for (const it of items) {
      const cx = it.caixas ?? 0;
      if (cx <= 0) continue;
      if (getBrazilHourFromIso(it.producaoUpdatedAt) === null) n += cx;
    }
    return n;
  }, [items]);

  const tituloColFiltro = formatWeekdayDayMonthBr(selectedDate);
  const tituloColPrev = comparisonPrev
    ? formatWeekdayDayMonthBr(comparisonPrev.date)
    : null;
  const tituloColD7 = formatWeekdayPassadaDayMonthBr(comparisonWeek.date);

  /**
   * Média cx/h numa janela [7h BR ; último producaoUpdatedAt do dia filtrado].
   * Mesma duração (ms) para ontem e D-7: 7h daquele dia até +windowMs.
   */
  const mediaComparacao = useMemo(() => {
    const startMs = brazilSevenAmUtcMs(selectedDate);
    if (!Number.isFinite(startMs)) return null;

    const lastMs = ultimoProducaoUpdatedAtMsNoDia(items, selectedDate);
    if (lastMs === null) return null;

    const windowMs = lastMs - startMs;
    if (windowMs <= 0) return null;

    const horas = windowMs / 3600000;
    const cxJanela = sumCaixasEmJanela(items, startMs, lastMs);
    const mediaDia = cxJanela / horas;

    let mediaOntem: number | null = null;
    if (comparisonPrev) {
      const sPrev = brazilSevenAmUtcMs(comparisonPrev.date);
      if (Number.isFinite(sPrev)) {
        const ePrev = sPrev + windowMs;
        const cxO = sumCaixasEmJanela(comparisonPrev.items, sPrev, ePrev);
        mediaOntem = cxO / horas;
      }
    }

    const sWeek = brazilSevenAmUtcMs(comparisonWeek.date);
    let mediaSemana: number | null = null;
    if (Number.isFinite(sWeek)) {
      const eWeek = sWeek + windowMs;
      const cxW = sumCaixasEmJanela(comparisonWeek.items, sWeek, eWeek);
      mediaSemana = cxW / horas;
    }

    const ultimoRegistroLabel = formatBrazilHourMinuteLabel(new Date(lastMs));

    return {
      mediaDia,
      mediaOntem,
      mediaSemana,
      ultimoRegistroLabel,
    };
  }, [selectedDate, items, comparisonPrev, comparisonWeek]);

  const previsaoFinalizacao = useMemo(() => {
    const hoje = getTodayISOInBrazilTimezone();
    if (selectedDate !== hoje) {
      return { visivel: false as const };
    }
    const falta = totais.faltaEmbalarCx;
    const { hour: curH } = getBrazilHourMinuteNow();
    const hAte20 = hoursRemainingUntilClockTodayBr(20, 0);
    const hAte21 = hoursRemainingUntilClockTodayBr(21, 0);
    const hAte22 = hoursRemainingUntilClockTodayBr(22, 0);

    if (falta <= 0) {
      return {
        visivel: true as const,
        falta,
        taxa20: null as number | null,
        taxa21: null as number | null,
        taxa22: null as number | null,
        hAte20,
        hAte21,
        hAte22,
        ritmoAnterior: null as number | null,
        ritmo: { kind: 'no_prev' as const },
        passouLimite20: hAte20 <= 0,
        passouLimite21: hAte21 <= 0,
        passouLimite22: hAte22 <= 0,
      };
    }

    const taxaPara = (h: number) => (h > 0 && falta > 0 ? falta / h : null);

    const ritmoAnterior =
      comparisonPrev !== null ? mediaCaixasHoraRestanteDiaAnterior(mapPrev, curH) : null;

    type Ritmo =
      | { kind: 'no_prev' }
      | { kind: 'no_media' }
      | { kind: 'termina'; hour: number; minute: number }
      | { kind: 'passa_22'; resto: number; embAte22: number };

    let ritmo: Ritmo = { kind: 'no_prev' };
    if (!comparisonPrev) {
      ritmo = { kind: 'no_prev' };
    } else if (ritmoAnterior === null) {
      ritmo = { kind: 'no_media' };
    } else {
      const finishMs = Date.now() + (falta / ritmoAnterior) * 3600000;
      const fin = getBrazilCalendarDateTimeFromInstant(new Date(finishMs));
      const terminaAte22Hoje =
        fin.dateISO === hoje &&
        (fin.hour < 22 || (fin.hour === 22 && fin.minute === 0));

      if (terminaAte22Hoje) {
        ritmo = { kind: 'termina', hour: fin.hour, minute: fin.minute };
      } else {
        const embAte22 = Math.min(falta, ritmoAnterior * hAte22);
        const resto = Math.max(0, Math.round(falta - embAte22));
        ritmo = {
          kind: 'passa_22',
          resto,
          embAte22: Math.round(embAte22),
        };
      }
    }

    return {
      visivel: true as const,
      falta,
      taxa20: taxaPara(hAte20),
      taxa21: taxaPara(hAte21),
      taxa22: taxaPara(hAte22),
      hAte20,
      hAte21,
      hAte22,
      ritmoAnterior,
      ritmo,
      passouLimite20: hAte20 <= 0,
      passouLimite21: hAte21 <= 0,
      passouLimite22: hAte22 <= 0,
    };
  }, [selectedDate, totais.faltaEmbalarCx, comparisonPrev, mapPrev]);

  const isToday = selectedDate === getTodayISOInBrazilTimezone();

  const showPrevisaoRulerCard =
    isToday &&
    previsaoFinalizacao.visivel &&
    previsaoFinalizacao.falta > 0;

  return (
    <aside
      className={['min-w-0 space-y-3 min-[960px]:sticky', belowEtapaToolbarStickyTop].join(' ')}
      aria-label="Painel de métricas do dia"
    >
      {(mediaComparacao !== null ||
        (previsaoFinalizacao.visivel && isToday)) && (
        <section className="min-w-0 space-y-2" aria-label="Previsão e ritmo">
          {previsaoFinalizacao.visivel && isToday && previsaoFinalizacao.falta <= 0 && (
            <p className="text-xs leading-snug text-success-fg sm:text-[13px]">
              Meta em caixas já atingida — nada a projetar.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {ritmoCompacto && mediaComparacao !== null ? (
              <RitmoCompactCard
                {...buildRitmoCompactoProps(
                  mediaComparacao,
                  showPrevisaoRulerCard ? previsaoFinalizacao.ritmo : null,
                  comparisonPrev,
                )}
              />
            ) : (
              <>
                {mediaComparacao !== null && (
                  <PrevisaoMetricCard
                    dense
                    icon={<IconBars className="h-4 w-4" />}
                    title={`Média 7h → ${mediaComparacao.ultimoRegistroLabel}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <p className="shrink-0 font-mono text-[15px] font-bold leading-none tabular-nums text-text-strong">
                        {formatCxPorHora(mediaComparacao.mediaDia)}
                      </p>
                      <div className="min-w-0 flex-1 space-y-px border-l border-stone-100 pl-2.5">
                        {comparisonPrev ? (
                          <StatCompare
                            compact
                            label="Ontem"
                            title="Ontem (mesma hora)"
                            value={mediaComparacao.mediaOntem}
                            unit="cx"
                            delta={
                              mediaComparacao.mediaOntem
                                ? Math.round(
                                    (mediaComparacao.mediaDia / mediaComparacao.mediaOntem - 1) *
                                      100,
                                  )
                                : null
                            }
                          />
                        ) : null}
                        <StatCompare
                          compact
                          label="Sem. passada"
                          title="Semana passada"
                          value={mediaComparacao.mediaSemana}
                          unit="cx"
                          delta={
                            mediaComparacao.mediaSemana
                              ? Math.round(
                                  (mediaComparacao.mediaDia / mediaComparacao.mediaSemana - 1) *
                                    100,
                                )
                              : null
                          }
                        />
                      </div>
                    </div>
                  </PrevisaoMetricCard>
                )}

                {showPrevisaoRulerCard ? (
                  <PrevisaoMetricCard
                    dense
                    icon={<IconTimelineRuler className="h-4 w-4" />}
                    title="Previsão até fechar"
                    className="min-h-0"
                    headerAside={
                      previsaoFinalizacao.ritmo.kind === 'passa_22' ? (
                        <span
                          className="inline-block text-xs font-semibold tabular-nums leading-tight text-danger"
                          title={`${formatIntPtBrOrDash(previsaoFinalizacao.ritmo.resto)} caixas para o dia seguinte`}
                        >
                          {formatIntPtBrOrDash(previsaoFinalizacao.ritmo.resto)}{' '}
                          <span className="font-medium text-danger/80">cx p/ amanhã</span>
                        </span>
                      ) : undefined
                    }
                  >
                    <PrevisaoAte22Ruler
                      previsao={{
                        falta: previsaoFinalizacao.falta,
                        taxa20: previsaoFinalizacao.taxa20,
                        taxa21: previsaoFinalizacao.taxa21,
                        taxa22: previsaoFinalizacao.taxa22,
                        passouLimite20: previsaoFinalizacao.passouLimite20,
                        passouLimite21: previsaoFinalizacao.passouLimite21,
                        passouLimite22: previsaoFinalizacao.passouLimite22,
                        ritmoAnterior: previsaoFinalizacao.ritmoAnterior,
                        ritmo: previsaoFinalizacao.ritmo,
                      }}
                    />
                  </PrevisaoMetricCard>
                ) : null}
              </>
            )}
          </div>
        </section>
      )}

      <section
        aria-label="Caixas por hora"
        className="overflow-hidden rounded-xl border border-border-default bg-surface shadow-control"
      >
        {hoursUnion.length === 0 ? (
          <p className="p-4 text-[13px] leading-snug text-text-muted sm:text-[15px]">
            Nenhuma caixa com horário de registro nos dias comparados — nada a listar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] table-fixed border-collapse text-[13px] leading-snug sm:min-w-[32rem] sm:text-[15px]">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[25%]" />
                <col className="w-[25%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border-default bg-stone-50">
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left align-bottom font-medium text-text-muted"
                  >
                    Intervalo
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right align-bottom">
                    <HourColumnHeader title={tituloColFiltro} emphasis="primary" />
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right align-bottom">
                    <HourColumnHeader
                      title={tituloColPrev ?? 'Dia anterior (sem dados)'}
                    />
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right align-bottom">
                    <HourColumnHeader title={tituloColD7} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {hoursUnion.map((hour, i) => {
                  const hasToday = getCaixasForHour(mapD, hour) > 0;
                  return (
                    <tr
                      key={hour}
                      className={[
                        'border-b border-stone-100 last:border-0',
                        hasToday ? 'bg-amber-50/45' : i % 2 ? 'bg-stone-50/60' : 'bg-surface',
                      ].join(' ')}
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-medium tabular-nums text-stone-700"
                      >
                        {formatIntervaloHoraBr(hour)}
                      </th>
                      <td className="px-3 py-2 align-middle">
                        <HourAccumPair map={mapD} hour={hour} emphasis="primary" />
                      </td>
                      <td className="px-3 py-2 align-middle text-stone-600">
                        {comparisonPrev ? (
                          <HourAccumPair map={mapPrev} hour={hour} emphasis="secondary" />
                        ) : (
                          <div className="text-right tabular-nums text-stone-400">—</div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <HourAccumPair map={mapWeek} hour={hour} emphasis="secondary" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!comparisonPrev && hoursUnion.length > 0 && (
          <p className="px-4 pb-3 text-[13px] leading-snug text-text-muted sm:text-base">
            Não foi encontrado dia anterior com pedidos (até 14 dias atrás).
          </p>
        )}
        {caixasSemHorario > 0 && (
          <p className="px-4 pb-4 text-[13px] leading-snug text-amber-800 sm:text-base">
            {formatIntPtBrOrDash(caixasSemHorario)} caixa(s) no dia filtrado sem horário em col. Q — não
            entram na tabela.
          </p>
        )}
      </section>
    </aside>
  );
}
