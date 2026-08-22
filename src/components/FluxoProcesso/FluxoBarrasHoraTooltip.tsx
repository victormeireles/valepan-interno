'use client';

import { fmtQty, type FluxoDisplayMode } from './fluxo-display-scale';
import type { FluxoHoraLegendaItem } from './FluxoHoraLegendaBuilder';

type FluxoBarrasHoraTooltipProps = {
  hora: number;
  total: number;
  previsto: number;
  unitLabel: string;
  mode: FluxoDisplayMode;
  itens: FluxoHoraLegendaItem[];
};

/**
 * Legenda da hora — aparece no hover/foco da coluna.
 * Cor + nome + valor (não só cor).
 */
export default function FluxoBarrasHoraTooltip({
  hora,
  total,
  previsto,
  unitLabel,
  mode,
  itens,
}: FluxoBarrasHoraTooltipProps) {
  const hh = String(hora).padStart(2, '0');
  const delta = total - previsto;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-2 z-20 min-w-[160px] max-w-[min(220px,calc(100%-8px))] rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-lg"
      style={{
        left: `calc(${(hora + 0.5) / 24} * 100%)`,
        transform: hora < 4 ? 'translateX(0)' : hora > 19 ? 'translateX(-100%)' : 'translateX(-50%)',
      }}
    >
      <div className="font-mono text-[12px] font-bold tabular-nums text-text-strong">
        {hh}:00 · {fmtQty(total, mode)} {unitLabel}
      </div>

      <p className="mt-1 font-mono text-[10px] tabular-nums text-text-muted">
        previsto {fmtQty(previsto, mode)} · realizado {fmtQty(total, mode)} · Δ{' '}
        {fmtQty(delta, mode)}
      </p>

      {itens.length === 0 ? (
        <p className="mt-1.5 text-[11px] text-text-muted">Sem apontamento</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {itens.map((item) => (
            <li key={item.assadeira} className="flex items-baseline gap-2 text-[11px]">
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ background: item.cor }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-text-body">{item.rotulo}</span>
              <span className="shrink-0 font-mono tabular-nums text-text-strong">
                {fmtQty(item.valor, mode)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {itens.some((i) => i.valorOpAnterior > 0) ? (
        <p className="mt-1.5 text-[10px] text-text-muted">
          Hachurado = OP de dia anterior
        </p>
      ) : null}
    </div>
  );
}
