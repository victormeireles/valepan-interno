'use client';

import Image from 'next/image';
import Link from 'next/link';
import { controlInputClassName } from '@/components/ui/Input';
import { MetaGapPill } from '@/components/ui/MetaGapPill';
import { pageShellBreakoutX, pageShellPaddingX } from '@/components/ui/page-shell';
import {
  getEtapaAccentClasses,
  getEtapaToolbarBackgroundStyle,
} from '@/components/Realizado/etapa/etapa-accent';
import type {
  RealizadoEtapaConfig,
  RealizadoEtapaToolbarMetrics,
} from '@/components/Realizado/etapa/types';
import { formatAgoraLabel } from '@/domain/painel-producao/painel-producao-time';
import { getBrazilHourMinuteNow } from '@/lib/utils/date-utils';

const BAR_TRACK =
  'h-1.5 w-[9.5rem] shrink-0 overflow-hidden rounded-full bg-stone-100 sm:w-[11rem]';
const BAR_FILL =
  'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

type PainelEtapaTvHeaderProps = {
  config: RealizadoEtapaConfig;
  selectedDate: string;
  onDateChange: (date: string) => void;
  metrics: RealizadoEtapaToolbarMetrics;
  diaLabel: string;
};

export default function PainelEtapaTvHeader({
  config,
  selectedDate,
  onDateChange,
  metrics,
  diaLabel,
}: PainelEtapaTvHeaderProps) {
  const accent = getEtapaAccentClasses(config.accent);
  const toolbarBg = getEtapaToolbarBackgroundStyle(config.pageBackground, config.accent);
  const unit = config.unit.toUpperCase();
  const fmt = (n: number) => n.toLocaleString('pt-BR');
  const { hour, minute } = getBrazilHourMinuteNow();
  const agora = formatAgoraLabel(hour, minute);

  return (
    <header
      className={[
        'sticky top-0 z-20 min-w-0 border-b border-border-default backdrop-blur-sm',
        pageShellBreakoutX,
      ].join(' ')}
      style={toolbarBg}
    >
      <div className={`h-[3px] ${accent.topBar}`} aria-hidden="true" />
      <div
        className={[
          'flex w-full min-w-0 flex-wrap items-center gap-3 py-2.5',
          pageShellPaddingX,
        ].join(' ')}
      >
        <Link
          href="/"
          aria-label="Início"
          className="inline-flex min-h-11 shrink-0 items-center"
        >
          <Image
            src="/logo-full-dark.png"
            alt="Valepan"
            width={148}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

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
              className={['text-[10px] font-semibold uppercase tracking-wide', accent.label].join(
                ' ',
              )}
            >
              {config.title}
            </div>
            <h1 className="truncate text-xl font-semibold tracking-[-0.015em] text-text-strong">
              {config.stageName}
            </h1>
          </div>
        </div>

        <div
          className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:gap-3"
          aria-label={`${config.toolbarMetricLabel} em ${config.unitName} em relação à meta`}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="flex items-baseline gap-1 font-mono text-sm tabular-nums">
              <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-text-muted">
                {config.toolbarMetricLabel}
              </span>
              <strong className="text-text-strong">{fmt(metrics.produzido)}</strong>
              <span className="text-stone-400">/</span>
              <span className="text-text-muted">
                {fmt(metrics.meta)} {unit}
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
            <MetaGapPill
              falta={metrics.falta}
              unit={unit}
              metaAtingida={metrics.metaAtingida}
            />
          </div>

          <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-text-muted">
            <span className="material-icons text-base" aria-hidden="true">
              schedule
            </span>
            {diaLabel} · agora {agora}
          </span>

          <input
            type="date"
            aria-label="Data de produção"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            className={controlInputClassName({
              size: 'default',
              fullWidth: false,
              className: 'w-[10.5rem] max-w-[10.5rem] px-2 text-sm',
            })}
          />
        </div>
      </div>
    </header>
  );
}
