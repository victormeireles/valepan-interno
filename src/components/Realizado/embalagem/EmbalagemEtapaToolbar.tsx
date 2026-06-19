'use client';

import { controlInputClassName } from '@/components/ui/Input';
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
          'flex w-full items-center gap-3 py-2.5 sm:gap-4',
          pageShellPaddingX,
        ].join(' ')}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
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

        <div className="ml-auto flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div
            className="hidden min-w-0 flex-col items-end gap-1 sm:flex"
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
              <span
                className={[
                  'text-xs font-semibold tabular-nums',
                  metaAtingida ? 'text-success' : 'text-accent',
                ].join(' ')}
              >
                {metaAtingida ? 'Meta ok' : `Falta ${fmt(faltaCx)}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 sm:hidden">
            <span className="font-mono text-xs font-semibold tabular-nums text-text-strong">
              {fmt(produzidoCx)}/{fmt(metaCx)} cx
            </span>
            <div className={BAR_TRACK} role="progressbar" aria-valuenow={Math.round(progressoPct)}>
              <div
                className={[BAR_FILL, metaAtingida ? 'bg-success' : 'bg-accent'].join(' ')}
                style={{ width: `${Math.min(100, progressoPct)}%` }}
              />
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
