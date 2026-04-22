'use client';

export type VolumeTriploLabels = {
  /** Texto curto da barra (ex.: "latas (LT c/ 48)" ou "unidades") */
  unitLine: string;
  meta: string;
  etapaAnterior: string;
  etapaAtual: string;
  compactAnterior?: string;
  compactAtual?: string;
  /** Texto abaixo da barra (default); null para omitir */
  footer?: string | null;
  semMetaDetalhe?: string;
};

/** Ordem das três caixas de valores abaixo da barra. Padrão: meta · etapa anterior · etapa atual. */
export type VolumeTriploStatsOrder = Array<'meta' | 'anterior' | 'atual'>;

type VolumeTriploProgressoBarProps = {
  meta: number;
  etapaAnterior: number;
  etapaAtual: number;
  unidadeCurta: 'LT' | 'un';
  unidadesPorAssadeira?: number | null;
  variant?: 'default' | 'compact';
  labels: VolumeTriploLabels;
  /** Ex.: fermentação na fila: fermentação · massa · meta */
  statsColumnOrder?: VolumeTriploStatsOrder;
  /** Texto opcional entre o título e a barra (ex.: latas faltantes na fermentação). */
  hintBelowTitle?: string | null;
  /** Sem borda/card próprio — útil dentro de um cartão pai (ex.: saída do forno + botão). */
  embedded?: boolean;
};

function fmtQuant(n: number) {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

const DEFAULT_STATS_ORDER: VolumeTriploStatsOrder = ['meta', 'anterior', 'atual'];

export default function VolumeTriploProgressoBar({
  meta,
  etapaAnterior,
  etapaAtual,
  unidadeCurta,
  unidadesPorAssadeira,
  variant = 'default',
  labels,
  statsColumnOrder = DEFAULT_STATS_ORDER,
  hintBelowTitle = null,
  embedded = false,
}: VolumeTriploProgressoBarProps) {
  const compact = variant === 'compact';
  const unitLine =
    labels.unitLine ||
    (unidadeCurta === 'LT' && unidadesPorAssadeira != null && unidadesPorAssadeira > 0
      ? `latas (LT c/ ${unidadesPorAssadeira.toLocaleString('pt-BR')})`
      : 'unidades');

  const pct = (v: number) => (meta > 0 ? Math.min(100, (v / meta) * 100) : 0);
  const anteriorW = pct(etapaAnterior);
  const atualW = pct(etapaAtual);

  if (meta <= 0 && etapaAnterior <= 0 && etapaAtual <= 0) {
    return null;
  }

  if (meta <= 0) {
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50/80 text-amber-950 ${
          compact ? 'p-2 text-xs' : 'p-4 text-sm'
        }`}
      >
        <p className="font-semibold">Progresso em {unitLine}</p>
        <p className={`text-amber-900/90 ${compact ? 'mt-0.5 text-[11px] leading-snug' : 'mt-1 text-xs'}`}>
          {labels.semMetaDetalhe ??
            `${labels.etapaAnterior}: ${fmtQuant(etapaAnterior)} · ${labels.etapaAtual}: ${fmtQuant(etapaAtual)}.`}
        </p>
      </div>
    );
  }

  const ca = labels.compactAnterior ?? labels.etapaAnterior.slice(0, 4);
  const cu = labels.compactAtual ?? labels.etapaAtual.slice(0, 4);

  const statCellCompact = (key: 'meta' | 'anterior' | 'atual') => {
    if (key === 'meta') {
      return (
        <li
          key="meta"
          className="rounded border border-slate-100 bg-white/90 px-1 py-0.5 sm:rounded-md sm:px-1.5 sm:py-1"
        >
          <span className="block leading-tight text-slate-500 max-sm:text-[9px]">{labels.meta}</span>
          <span className="font-bold tabular-nums text-slate-900">{fmtQuant(meta)}</span>
        </li>
      );
    }
    if (key === 'anterior') {
      return (
        <li
          key="anterior"
          className="rounded border border-sky-100 bg-sky-50 px-1 py-0.5 sm:rounded-md sm:px-1.5 sm:py-1"
        >
          <span className="block leading-tight text-sky-800/90 max-sm:text-[9px]">{ca}</span>
          <span className="font-bold tabular-nums text-sky-800">{fmtQuant(etapaAnterior)}</span>
        </li>
      );
    }
    return (
      <li
        key="atual"
        className="rounded border border-emerald-100 bg-emerald-50 px-1 py-0.5 sm:rounded-md sm:px-1.5 sm:py-1"
      >
        <span className="block leading-tight text-emerald-900/85 max-sm:text-[9px]">{cu}</span>
        <span className="font-bold tabular-nums text-emerald-900">{fmtQuant(etapaAtual)}</span>
      </li>
    );
  };

  const statCellDefault = (key: 'meta' | 'anterior' | 'atual') => {
    if (key === 'meta') {
      return (
        <li key="meta" className="rounded-lg bg-slate-50/80 px-3 py-2">
          <span className="block text-xs font-medium text-slate-500">{labels.meta}</span>
          <span className="font-semibold text-slate-900">{fmtQuant(meta)}</span>
        </li>
      );
    }
    if (key === 'anterior') {
      return (
        <li key="anterior" className="rounded-lg bg-sky-50/80 px-3 py-2">
          <span className="block text-xs font-medium text-sky-800/90">{labels.etapaAnterior}</span>
          <span className="font-semibold text-sky-800">{fmtQuant(etapaAnterior)}</span>
        </li>
      );
    }
    return (
      <li key="atual" className="rounded-lg bg-emerald-50/80 px-3 py-2">
        <span className="block text-xs font-medium text-emerald-900/85">{labels.etapaAtual}</span>
        <span className="font-semibold text-emerald-900">{fmtQuant(etapaAtual)}</span>
      </li>
    );
  };

  if (compact) {
    const compactShell =
      embedded
        ? 'space-y-1.5 sm:space-y-2'
        : 'space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/90 p-2 sm:p-2.5 sm:space-y-2';
    return (
      <div className={compactShell}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:text-[11px]">
          Progresso ({unitLine})
        </p>
        {hintBelowTitle ? (
          <p className="text-[10px] font-semibold tabular-nums leading-snug text-slate-800 sm:text-[11px]">
            {hintBelowTitle}
          </p>
        ) : null}
        <div
          className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
          role="img"
          aria-label={`Meta ${fmtQuant(meta)}, ${labels.etapaAnterior} ${fmtQuant(etapaAnterior)}, ${labels.etapaAtual} ${fmtQuant(etapaAtual)}`}
        >
          <div
            className="absolute left-0 top-0 h-full bg-sky-500 transition-[width] duration-300 ease-out"
            style={{ width: `${anteriorW}%` }}
          />
          <div
            className="absolute left-0 top-0 z-[1] h-full bg-emerald-600 transition-[width] duration-300 ease-out"
            style={{ width: `${atualW}%` }}
          />
        </div>
        <ul className="grid grid-cols-3 gap-1 text-[10px] text-slate-700 sm:gap-1.5 sm:text-[11px]">
          {statsColumnOrder.map((k) => statCellCompact(k))}
        </ul>
      </div>
    );
  }

  const defaultShell =
    embedded
      ? 'space-y-3'
      : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3';

  return (
    <div className={defaultShell}>
      <p className="text-sm font-semibold text-slate-900">Progresso ({unitLine})</p>
      {hintBelowTitle ? (
        <p className="text-sm font-medium tabular-nums text-slate-800">{hintBelowTitle}</p>
      ) : null}

      <div
        className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200"
        role="img"
        aria-label={`Meta ${fmtQuant(meta)}, ${labels.etapaAnterior} ${fmtQuant(etapaAnterior)}, ${labels.etapaAtual} ${fmtQuant(etapaAtual)}`}
      >
        <div
          className="absolute left-0 top-0 h-full bg-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${anteriorW}%` }}
        />
        <div
          className="absolute left-0 top-0 z-[1] h-full bg-emerald-600 transition-[width] duration-300 ease-out"
          style={{ width: `${atualW}%` }}
        />
      </div>

      <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
        {statsColumnOrder.map((k) => statCellDefault(k))}
      </ul>

      {labels.footer != null && labels.footer !== '' && (
        <p className="text-xs text-slate-500 leading-relaxed">{labels.footer}</p>
      )}
    </div>
  );
}
