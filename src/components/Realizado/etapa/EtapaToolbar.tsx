'use client';

import { Button } from '@/components/ui/Button';
import { controlInputClassName } from '@/components/ui/Input';
import {
  belowAppNavStickyTop,
  pageShellBreakoutX,
  pageShellPaddingX,
} from '@/components/ui/page-shell';
import { getEtapaAccentClasses, getEtapaToolbarBackgroundStyle } from './etapa-accent';
import type { RealizadoEtapaConfig, RealizadoEtapaToolbarMetrics } from './types';

const BAR_TRACK =
  'h-1.5 w-[9.5rem] shrink-0 rounded-full bg-stone-100 overflow-hidden sm:w-[11rem]';
const BAR_FILL =
  'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

type EtapaToolbarProps = {
  config: RealizadoEtapaConfig;
  selectedDate: string;
  onDateChange: (date: string) => void;
  metrics: RealizadoEtapaToolbarMetrics;
  hasMeta?: boolean;
  onExtraAction?: () => void;
};

export default function EtapaToolbar({
  config,
  selectedDate,
  onDateChange,
  metrics,
  hasMeta = true,
  onExtraAction,
}: EtapaToolbarProps) {
  const accent = getEtapaAccentClasses(config.accent);
  const toolbarBg = getEtapaToolbarBackgroundStyle(config.pageBackground, config.accent);
  const fmt = (n: number) => n.toLocaleString('pt-BR');
  const unitSuffix = config.unit;

  return (
    <header
      className={[
        'sticky z-20 border-b border-border-default backdrop-blur-sm',
        belowAppNavStickyTop,
        pageShellBreakoutX,
      ].join(' ')}
      style={toolbarBg}
    >
      <div className={`h-[3px] ${accent.topBar}`} aria-hidden="true" />
      <div
        className={[
          'flex w-full items-center gap-3 py-2.5 sm:gap-4',
          pageShellPaddingX,
        ].join(' ')}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span
            className={[
              'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]',
              accent.iconBg,
              accent.iconText,
            ].join(' ')}
          >
            <span className="material-icons text-xl" aria-hidden="true">
              {config.icon}
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <div
              className={[
                'text-[10px] font-semibold uppercase tracking-wide',
                accent.label,
              ].join(' ')}
            >
              {config.title}
            </div>
            <h1 className="truncate text-xl font-semibold tracking-[-0.015em] text-text-strong">
              {config.stageName}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2.5 sm:gap-3">
          {hasMeta ? (
            <>
              <div
                className="hidden min-w-0 flex-col items-end gap-1 sm:flex"
                aria-label={`${config.toolbarMetricLabel} em ${config.unitName} em relação à meta`}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="flex items-baseline gap-1 font-mono text-sm tabular-nums">
                    <span className="text-[10px] font-sans font-medium uppercase tracking-wide text-text-muted">
                      {config.toolbarMetricLabel}
                    </span>
                    <strong className="text-text-strong">{fmt(metrics.produzido)}</strong>
                    <span className="text-stone-400">/</span>
                    <span className="text-text-muted">
                      {fmt(metrics.meta)} {unitSuffix}
                    </span>
                  </div>
                  <div
                    className={BAR_TRACK}
                    role="progressbar"
                    aria-valuenow={Math.round(metrics.progressoPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={[
                        BAR_FILL,
                        metrics.metaAtingida ? 'bg-success' : accent.progressFill,
                      ].join(' ')}
                      style={{ width: `${Math.min(100, metrics.progressoPct)}%` }}
                    />
                  </div>
                  <span
                    className={[
                      'text-xs font-semibold tabular-nums',
                      metrics.metaAtingida ? 'text-success' : accent.progressText,
                    ].join(' ')}
                  >
                    {metrics.metaAtingida ? 'Meta ok' : `Falta ${fmt(metrics.falta)}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 sm:hidden">
                <span className="font-mono text-xs font-semibold tabular-nums text-text-strong">
                  {fmt(metrics.produzido)}/{fmt(metrics.meta)} {unitSuffix}
                </span>
                <div
                  className={BAR_TRACK}
                  role="progressbar"
                  aria-valuenow={Math.round(metrics.progressoPct)}
                >
                  <div
                    className={[
                      BAR_FILL,
                      metrics.metaAtingida ? 'bg-success' : accent.progressFill,
                    ].join(' ')}
                    style={{ width: `${Math.min(100, metrics.progressoPct)}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="font-mono text-xs font-semibold tabular-nums text-text-strong sm:hidden">
                {fmt(metrics.produzido)} {unitSuffix}
              </span>
              <div
                className="hidden items-baseline gap-1.5 font-mono text-sm tabular-nums sm:flex"
                aria-label={`Total em ${config.unitName}`}
              >
                <span className="text-[10px] font-sans font-medium uppercase tracking-wide text-text-muted">
                  {config.toolbarMetricLabel}
                </span>
                <strong className="text-text-strong">
                  {fmt(metrics.produzido)} {unitSuffix}
                </strong>
              </div>
            </>
          )}

          {config.extraActionLabel && onExtraAction ? (
            <Button
              variant="secondary"
              size="md"
              icon="add"
              onClick={onExtraAction}
              className="shrink-0"
            >
              <span className="max-[520px]:sr-only">{config.extraActionLabel}</span>
            </Button>
          ) : null}

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
