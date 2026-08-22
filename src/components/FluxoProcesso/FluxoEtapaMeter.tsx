'use client';

type FluxoEtapaMeterProps = {
  label: string;
  fillPct: number | null;
  cor: string;
  value: string;
  ariaLabel: string;
};

/**
 * Rótulo + % alinhado + barra + absoluto à direita.
 * O % não vai na barra: fill claro falha contraste; fill baixo some o texto.
 */
export default function FluxoEtapaMeter({
  label,
  fillPct,
  cor,
  value,
  ariaLabel,
}: FluxoEtapaMeterProps) {
  if (fillPct == null) return null;

  return (
    <div className="grid min-w-0 grid-cols-[2.75rem_2.35rem_minmax(0,1fr)_auto] items-center gap-x-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="text-right font-mono text-[12px] tabular-nums text-text-muted">
        {fillPct}%
      </span>
      <div
        className="relative h-1 overflow-hidden rounded-full bg-stone-100"
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fillPct}
        aria-valuetext={`${fillPct} por cento, ${value}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${fillPct}%`, background: cor }}
        />
      </div>
      <span className="min-w-[3.25rem] text-right font-mono text-[12px] font-semibold tabular-nums text-text-strong">
        {value}
      </span>
    </div>
  );
}
