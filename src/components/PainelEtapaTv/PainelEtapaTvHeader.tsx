'use client';

import Image from 'next/image';
import Link from 'next/link';
import { controlInputClassName } from '@/components/ui/Input';
import { MetaGapPill } from '@/components/ui/MetaGapPill';
import { pageShellPaddingX } from '@/components/ui/page-shell';
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
  'h-1.5 w-full overflow-hidden rounded-full bg-stone-100 lg:w-[11rem] lg:shrink-0';
const BAR_FILL =
  'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

type PainelEtapaTvHeaderProps = {
  config: RealizadoEtapaConfig;
  selectedDate: string;
  onDateChange: (date: string) => void;
  metrics: RealizadoEtapaToolbarMetrics;
};

function BrandBlock({ config }: { config: RealizadoEtapaConfig }) {
  const accent = getEtapaAccentClasses(config.accent);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Link href="/" aria-label="Início" className="inline-flex min-h-11 shrink-0 items-center">
        <Image
          src="/logo-full-dark.png"
          alt="Valepan"
          width={148}
          height={36}
          className="h-7 w-auto max-w-[7.5rem] lg:h-9 lg:max-w-none"
          priority
        />
      </Link>
      <span
        className={[
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px]',
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
          className={['text-[10px] font-semibold uppercase tracking-wide', accent.label].join(' ')}
        >
          {config.title}
        </div>
        <h1 className="truncate text-lg font-semibold tracking-[-0.015em] text-text-strong lg:text-xl">
          {config.stageName}
        </h1>
      </div>
    </div>
  );
}

function MetricsBlock({
  config,
  metrics,
}: {
  config: RealizadoEtapaConfig;
  metrics: RealizadoEtapaToolbarMetrics;
}) {
  const accent = getEtapaAccentClasses(config.accent);
  const unit = config.unit.toUpperCase();
  const fmt = (n: number) => n.toLocaleString('pt-BR');

  return (
    <div
      className="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-2"
      aria-label={`${config.toolbarMetricLabel} em ${config.unitName} em relação à meta`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
        <MetaGapPill
          falta={metrics.falta}
          unit={unit}
          metaAtingida={metrics.metaAtingida}
        />
      </div>
      <div
        className={BAR_TRACK}
        role="progressbar"
        aria-valuenow={Math.round(metrics.progressoPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={[BAR_FILL, metrics.metaAtingida ? 'bg-success' : accent.progressFill].join(' ')}
          style={{ width: `${Math.min(100, metrics.progressoPct)}%` }}
        />
      </div>
    </div>
  );
}

export default function PainelEtapaTvHeader({
  config,
  selectedDate,
  onDateChange,
  metrics,
}: PainelEtapaTvHeaderProps) {
  const toolbarBg = getEtapaToolbarBackgroundStyle(config.pageBackground, config.accent);
  const accent = getEtapaAccentClasses(config.accent);
  const { hour, minute } = getBrazilHourMinuteNow();
  const agora = formatAgoraLabel(hour, minute);

  return (
    <header
      className="sticky top-0 z-20 min-w-0 shrink-0 border-b border-border-default pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      style={toolbarBg}
    >
      <div className={`h-[3px] ${accent.topBar}`} aria-hidden="true" />
      <div
        className={[
          'flex w-full min-w-0 flex-col gap-2.5 py-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3',
          pageShellPaddingX,
        ].join(' ')}
      >
        <BrandBlock config={config} />
        <div className="flex min-w-0 flex-col gap-2 lg:ml-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
          <MetricsBlock config={config} metrics={metrics} />
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-text-muted">
              <span className="material-icons text-base" aria-hidden="true">
                schedule
              </span>
              agora {agora}
            </span>
            <input
              type="date"
              aria-label="Data da OP"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className={controlInputClassName({
                size: 'default',
                fullWidth: false,
                className: 'w-[10.5rem] max-w-[10.5rem] px-2 touch-manipulation',
              })}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
