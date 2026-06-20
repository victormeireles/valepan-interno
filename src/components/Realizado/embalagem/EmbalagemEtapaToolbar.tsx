'use client';

import { controlInputClassName } from '@/components/ui/Input';
import { MetaGapPill } from '@/components/ui/MetaGapPill';
import {
  belowAppNavStickyTop,
  pageShellBreakoutX,
  pageShellPaddingX,
} from '@/components/ui/page-shell';

const BAR_TRACK = 'h-1.5 w-[9.5rem] shrink-0 rounded-full bg-stone-100 overflow-hidden sm:w-[11rem]';
const BAR_FILL =
  'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

export type EmbalagemEtapaToolbarProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  produzidoCx: number;
  metaCx: number;
  faltaCx: number;
  progressoPct: number;
  metaAtingida: boolean;
};

export default function EmbalagemEtapaToolbar({
  selectedDate,
  onDateChange,
  produzidoCx,
  metaCx,
  faltaCx,
  progressoPct,
  metaAtingida,
}: EmbalagemEtapaToolbarProps) {
  const fmt = (n: number) => n.toLocaleString('pt-BR');

  return (
    <header
      className={[
        'sticky z-20 border-b border-border-default bg-app/95 backdrop-blur-sm',
        belowAppNavStickyTop,
        pageShellBreakoutX,
      ].join(' ')}
    >
      <div className="h-[3px] bg-accent" aria-hidden="true" />
      <div
        className={[
          'flex w-full flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-4',
          pageShellPaddingX,
        ].join(' ')}
      >
        <div className="flex w-full min-w-0 items-center gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-amber-100 text-accent">
              <span className="material-icons text-xl" aria-hidden="true">
                inventory_2
              </span>
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                Realizado
              </div>
              <h1 className="truncate text-xl font-semibold tracking-[-0.015em] text-text-strong">
                Embalagem
              </h1>
            </div>
          </div>

          <input
            type="date"
            aria-label="Data de produção"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className={controlInputClassName({
              size: 'compact',
              fullWidth: false,
              className: 'ml-auto w-[9.25rem] max-w-[9.25rem] shrink-0 px-2 sm:hidden',
            })}
          />
        </div>

        <div
          className="flex w-full min-w-0 items-center gap-2 sm:hidden"
          aria-label="Embalado em caixas em relação à meta"
        >
          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-text-strong">
            {fmt(produzidoCx)}/{fmt(metaCx)} cx
          </span>
          <div
            className="h-1.5 min-w-0 flex-1 rounded-full bg-stone-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progressoPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={[BAR_FILL, metaAtingida ? 'bg-success' : 'bg-accent'].join(' ')}
              style={{ width: `${Math.min(100, progressoPct)}%` }}
            />
          </div>
          <MetaGapPill falta={faltaCx} unit="cx" metaAtingida={metaAtingida} />
        </div>

        <div className="ml-auto hidden min-w-0 items-center gap-2.5 sm:flex sm:gap-3">
          <div
            className="flex min-w-0 flex-col items-end gap-1"
            aria-label="Embalado em caixas em relação à meta"
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="flex items-baseline gap-1 font-mono text-sm tabular-nums">
                <span className="text-[10px] font-sans font-medium uppercase tracking-wide text-text-muted">
                  Embalado
                </span>
                <strong className="text-text-strong">{fmt(produzidoCx)}</strong>
                <span className="text-stone-400">/</span>
                <span className="text-text-muted">{fmt(metaCx)} cx</span>
              </div>
              <div
                className={BAR_TRACK}
                role="progressbar"
                aria-valuenow={Math.round(progressoPct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={[BAR_FILL, metaAtingida ? 'bg-success' : 'bg-accent'].join(' ')}
                  style={{ width: `${Math.min(100, progressoPct)}%` }}
                />
              </div>
              <MetaGapPill falta={faltaCx} unit="cx" metaAtingida={metaAtingida} />
            </div>
          </div>

          <input
            type="date"
            aria-label="Data de produção"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className={controlInputClassName({
              size: 'compact',
              fullWidth: false,
              className: 'w-[9.25rem] max-w-[9.25rem] px-2',
            })}
          />
        </div>
      </div>
    </header>
  );
}
