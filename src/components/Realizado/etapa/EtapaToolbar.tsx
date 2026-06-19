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
          'flex w-full flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-4',
          pageShellPaddingX,
        ].join(' ')}
      >
        {/* Linha 1: identidade + filtro de data (mobile) */}
        <div className="flex w-full min-w-0 items-center gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
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

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">
            {config.extraActionLabel && onExtraAction ? (
              <Button
                variant="secondary"
                size="md"
                icon="add"
                onClick={onExtraAction}
                className="shrink-0"
              >
                <span className="sr-only">{config.extraActionLabel}</span>
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

        {/* Linha 2 mobile: progresso em largura total */}
        {hasMeta ? (
          <div
            className="flex w-full min-w-0 items-center gap-2 sm:hidden"
            aria-label={`${config.toolbarMetricLabel} em ${config.unitName} em relação à meta`}
          >
            <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-text-strong">
              {fmt(metrics.produzido)}/{fmt(metrics.meta)} {unitSuffix}
            </span>
            <div
              className="h-1.5 min-w-0 flex-1 rounded-full bg-stone-100 overflow-hidden"
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
                'shrink-0 text-xs font-semibold tabular-nums',
                metrics.metaAtingida ? 'text-success' : accent.progressText,
              ].join(' ')}
            >
              {metrics.metaAtingida ? 'Meta ok' : `Falta ${fmt(metrics.falta)}`}
            </span>
          </div>
        ) : (
          <div
            className="font-mono text-xs font-semibold tabular-nums text-text-strong sm:hidden"
            aria-label={`Total em ${config.unitName}`}
          >
            {fmt(metrics.produzido)} {unitSuffix}
          </div>
        )}

        {/* Desktop: cluster único à direita */}
        <div className="ml-auto hidden min-w-0 items-center gap-2.5 sm:flex sm:gap-3">
          {hasMeta ? (
            <div
              className="flex min-w-0 flex-col items-end gap-1"
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
          ) : (
            <div
              className="flex items-baseline gap-1.5 font-mono text-sm tabular-nums"
              aria-label={`Total em ${config.unitName}`}
            >
              <span className="text-[10px] font-sans font-medium uppercase tracking-wide text-text-muted">
                {config.toolbarMetricLabel}
              </span>
              <strong className="text-text-strong">
                {fmt(metrics.produzido)} {unitSuffix}
              </strong>
            </div>
          )}

          {config.extraActionLabel && onExtraAction ? (
            <Button
              variant="secondary"
              size="md"
              icon="add"
              onClick={onExtraAction}
              className="shrink-0"
            >
              {config.extraActionLabel}
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
