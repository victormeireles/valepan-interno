'use client';

import { useMemo, type ReactNode } from 'react';
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
  /** Cabeçalho: compacto ao lado da data; células: metades iguais à largura da coluna. */
  inline?: boolean;
}) {
  if (inline) {
    return (
      <span className="whitespace-nowrap align-baseline tabular-nums">
        <span className="border-r border-gray-600/55 pr-1">{left}</span>
        <span className="pl-1">{right}</span>
      </span>
    );
  }
  return (
    <div className="flex w-full min-w-0 items-baseline tabular-nums whitespace-nowrap">
      <div className="min-w-0 flex-1 basis-0 border-r border-gray-600/55 pr-2 text-right">{left}</div>
      <div className="min-w-0 flex-1 basis-0 pl-2 text-left">{right}</div>
    </div>
  );
}

function HourAccumColumnSubheads() {
  const subCls =
    'text-[13px] font-normal leading-snug tracking-normal text-gray-500 sm:text-sm';
  return (
    <HourAccumSplitColumns
      inline
      left={<span className={subCls}>hora</span>}
      right={<span className={subCls}>acum.</span>}
    />
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
      ? 'font-semibold text-amber-200/95'
      : 'font-medium text-gray-200';
  const acumClass = emphasis === 'primary' ? 'text-gray-400' : 'text-gray-500';
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
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
  headerAside?: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className={`flex min-h-0 min-w-0 items-start gap-2 rounded-lg border border-gray-700/90 bg-gradient-to-br from-gray-900/80 to-gray-900/40 px-2 py-2 ${className ?? ''}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/12 text-amber-400/95 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-[13px] font-semibold uppercase tracking-wide text-gray-500 leading-snug sm:text-sm">
            {title}
          </p>
          {headerAside != null ? (
            <div className="max-w-[min(100%,12rem)] shrink-0 text-right">{headerAside}</div>
          ) : null}
        </div>
        <div className="text-[13px] leading-snug text-gray-100 sm:text-[15px]">{children}</div>
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

  const tickLineClass = band === 'amanha' ? 'bg-white/50' : 'bg-gray-600/45';

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
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-400 sm:text-[15px] leading-snug">
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
              className="absolute top-1/2 z-[2] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-800 bg-white shadow-sm"
              style={{ left: `${agoraMarkerPct}%` }}
              title="Agora"
            />
          )}
          {showFillArrow && (
            <div
              className="pointer-events-none absolute top-1/2 z-[2] -translate-x-[1px] -translate-y-1/2 text-white drop-shadow-sm"
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
              className={`text-sm tabular-nums leading-snug sm:text-[15px] ${
                r.passed ? 'text-gray-600' : 'font-medium text-gray-200'
              }`}
            >
              {r.passed ? '—' : formatCxPorHora(r.taxa)}
            </span>
          </div>
        ))}
      </div>

      {band === 'sem_estimativa' && (
        <p className="text-center text-[13px] leading-snug text-gray-500 sm:text-base">{fimLegenda}</p>
      )}

      {ritmo.kind === 'termina' && (
        <p className="text-center text-[13px] text-gray-500 sm:text-base">
          Estimativa{' '}
          <span
            className={`font-semibold tabular-nums ${
              band === 'folga' ? 'text-emerald-400/95' : 'text-amber-300/95'
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
  'h-2.5 w-full max-w-full rounded-full bg-gray-700 overflow-hidden';
const EMBALAGEM_BAR_FILL_CLASS =
  'h-full max-w-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

type EmbalagemDashboardProps = {
  selectedDate: string;
  items: EmbalagemDashboardItem[];
  comparisonPrev: { date: string; items: EmbalagemDashboardItem[] } | null;
  comparisonWeek: { date: string; items: EmbalagemDashboardItem[] };
};

export default function EmbalagemDashboard({
  selectedDate,
  items,
  comparisonPrev,
  comparisonWeek,
}: EmbalagemDashboardProps) {
  const totais = useMemo(() => {
    const totalCaixasProduzido = items.reduce((sum, item) => sum + (item.caixas || 0), 0);
    const totalCaixasMeta = items.reduce((sum, item) => sum + (item.pedidoCaixas || 0), 0);
    const progressoCaixasPct =
      totalCaixasMeta > 0
        ? Math.min(100, (totalCaixasProduzido / totalCaixasMeta) * 100)
        : 0;
    const faltaEmbalarCx = Math.max(0, totalCaixasMeta - totalCaixasProduzido);
    return {
      produzido: `${totalCaixasProduzido} cx`,
      meta: `${totalCaixasMeta} cx`,
      progressoCaixasPct,
      faltaEmbalarCx,
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

  const forecastGridClass = useMemo(() => {
    const hasMedia = mediaComparacao !== null;
    if (hasMedia && showPrevisaoRulerCard)
      return 'sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]';
    return 'sm:grid-cols-1';
  }, [mediaComparacao, showPrevisaoRulerCard]);

  return (
    <aside
      className="min-w-0 rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 shadow-inner lg:sticky lg:top-4 space-y-6"
      aria-label="Painel de métricas do dia"
    >
      <section aria-label="Resumo do dia">
        <div className="flex flex-wrap gap-4 items-baseline justify-between">
          <div>
            <p className="text-[13px] uppercase tracking-wide text-gray-400 sm:text-sm">
              Embalado / meta
            </p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {totais.produzido}
              <span className="text-gray-500 font-normal mx-1">/</span>
              <span className="text-gray-300">{totais.meta}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-gray-400 sm:text-sm">Falta embalar</p>
            <p className="text-xl font-semibold text-amber-300 tabular-nums">
              {totais.faltaEmbalarCx} cx
            </p>
          </div>
        </div>
        <div
          className={`mt-3 ${EMBALAGEM_BAR_TRACK_CLASS}`}
          role="progressbar"
          aria-valuenow={Math.round(totais.progressoCaixasPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Embalado em caixas em relação à meta em caixas"
        >
          <div
            className={`${EMBALAGEM_BAR_FILL_CLASS} bg-amber-500`}
            style={{ width: `${Math.min(100, totais.progressoCaixasPct)}%` }}
          />
        </div>
      </section>

      {(mediaComparacao !== null ||
        (previsaoFinalizacao.visivel && isToday)) && (
        <section className="!mt-4 space-y-2" aria-label="Previsão e ritmo">
          {previsaoFinalizacao.visivel && isToday && previsaoFinalizacao.falta <= 0 && (
            <p className="text-[13px] leading-snug text-emerald-300/95 sm:text-[15px]">
              Meta em caixas já atingida — nada a projetar.
            </p>
          )}
          <div className={`grid grid-cols-1 items-start gap-2 ${forecastGridClass}`}>
            {mediaComparacao !== null && (
              <PrevisaoMetricCard
                icon={<IconBars className="h-5 w-5" />}
                title={`Média 7h → ${mediaComparacao.ultimoRegistroLabel}`}
              >
                <div className="flex w-full flex-col gap-1 leading-snug">
                  <p className="text-base font-semibold tabular-nums text-amber-200/95 sm:text-lg">
                    {formatCxPorHora(mediaComparacao.mediaDia)}
                  </p>
                  {comparisonPrev ? (
                    <p className="text-[13px] leading-snug text-gray-400 sm:text-sm">
                      Ontem (mesma hora):{' '}
                      <span className="tabular-nums text-gray-200">
                        {formatCxPorHora(mediaComparacao.mediaOntem)}
                      </span>
                    </p>
                  ) : null}
                  <p className="text-[13px] leading-snug text-gray-400 sm:text-sm">
                    Semana passada:{' '}
                    <span className="tabular-nums text-gray-200">
                      {formatCxPorHora(mediaComparacao.mediaSemana)}
                    </span>
                  </p>
                </div>
              </PrevisaoMetricCard>
            )}

            {showPrevisaoRulerCard ? (
              <PrevisaoMetricCard
                icon={<IconTimelineRuler className="h-5 w-5" />}
                title="Previsão até fechar (ritmo de ontem)"
                className="min-h-0"
                headerAside={
                  previsaoFinalizacao.ritmo.kind === 'passa_22' ? (
                    <span
                      className="inline-block text-base font-semibold tabular-nums leading-tight text-rose-200"
                      title={`${formatIntPtBrOrDash(previsaoFinalizacao.ritmo.resto)} caixas para o dia seguinte`}
                    >
                      {formatIntPtBrOrDash(previsaoFinalizacao.ritmo.resto)}{' '}
                      <span className="text-rose-100">cx p/ amanhã</span>
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
          </div>
        </section>
      )}

      <section aria-label="Caixas por hora">
        {hoursUnion.length === 0 ? (
          <p className="text-[13px] leading-snug text-gray-500 sm:text-[15px]">
            Nenhuma caixa com horário de registro nos dias comparados — nada a listar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700/80">
            <table className="w-full min-w-[320px] table-fixed border-collapse text-[13px] sm:text-[15px] leading-snug">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[26%]" />
                <col className="w-[26%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/50">
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left font-medium text-gray-300 align-bottom"
                  >
                    Intervalo
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right align-bottom font-medium text-amber-200/95"
                  >
                    <span className="inline-block whitespace-nowrap align-bottom">
                      {tituloColFiltro} <HourAccumColumnSubheads />
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right align-bottom font-medium text-gray-300"
                  >
                    <span className="inline-block whitespace-nowrap align-bottom">
                      {tituloColPrev ?? 'Dia anterior (sem dados)'} <HourAccumColumnSubheads />
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right align-bottom font-medium text-gray-300"
                  >
                    <span className="inline-block whitespace-nowrap align-bottom">
                      {tituloColD7} <HourAccumColumnSubheads />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hoursUnion.map((hour) => (
                  <tr key={hour} className="border-b border-gray-700/60 last:border-0">
                    <th
                      scope="row"
                      className="px-3 py-2 tabular-nums text-left font-medium text-gray-200"
                    >
                      {formatIntervaloHoraBr(hour)}
                    </th>
                    <td className="px-3 py-2 align-middle">
                      <HourAccumPair map={mapD} hour={hour} emphasis="primary" />
                    </td>
                    <td className="px-3 py-2 align-middle text-gray-300">
                      {comparisonPrev ? (
                        <HourAccumPair map={mapPrev} hour={hour} emphasis="secondary" />
                      ) : (
                        <div className="text-right tabular-nums text-gray-500">—</div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <HourAccumPair map={mapWeek} hour={hour} emphasis="secondary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!comparisonPrev && hoursUnion.length > 0 && (
          <p className="mt-2 text-[13px] leading-snug text-gray-500 sm:text-base">
            Não foi encontrado dia anterior com pedidos (até 14 dias atrás).
          </p>
        )}
        {caixasSemHorario > 0 && (
          <p className="mt-2 text-[13px] leading-snug text-amber-200/80 sm:text-base">
            {formatIntPtBrOrDash(caixasSemHorario)} caixa(s) no dia filtrado sem horário em col. Q — não entram na
            tabela.
          </p>
        )}
      </section>
    </aside>
  );
}
