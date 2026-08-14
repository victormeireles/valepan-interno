'use client';

import { controlInputClassName } from '@/components/ui/Input';
import {
  belowAppNavStickyTop,
  pageShellBreakoutX,
  pageShellPaddingX,
} from '@/components/ui/page-shell';
import { getEtapaAccentClasses } from '@/components/Realizado/etapa/etapa-accent';
import {
  formatAgoraLabel,
  formatOpLabelFromDate,
} from '@/domain/painel-producao/painel-producao-time';
import { getBrazilHourMinuteNow } from '@/lib/utils/date-utils';
import { useFluxoDisplay } from './fluxo-display-context';
import type { FluxoDisplayMode } from './fluxo-display-scale';

const MODO_OPCOES: ReadonlyArray<{ value: FluxoDisplayMode; label: string }> = [
  { value: 'lt', label: 'Assadeiras' },
  { value: 'un', label: 'Unidades' },
  { value: 'cx', label: 'Caixas' },
];

type FluxoProcessoHeaderProps = {
  diaLabel: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
};

export default function FluxoProcessoHeader({
  diaLabel,
  selectedDate,
  onDateChange,
}: FluxoProcessoHeaderProps) {
  const accent = getEtapaAccentClasses('vinho');
  const { hour, minute } = getBrazilHourMinuteNow();
  const agora = formatAgoraLabel(hour, minute);
  const { mode, setMode } = useFluxoDisplay();

  return (
    <header
      className={[
        'sticky z-20 border-b border-border-default backdrop-blur-sm',
        belowAppNavStickyTop,
        pageShellBreakoutX,
        'bg-[color-mix(in_srgb,var(--brand-vinho)_4%,color-mix(in_srgb,var(--bg-app)_94%,transparent))]',
      ].join(' ')}
    >
      <div className="h-[3px] bg-brand-vinho" aria-hidden="true" />
      <div
        className={['flex w-full flex-wrap items-center gap-4 py-3', pageShellPaddingX].join(' ')}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={[
              'grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[9px]',
              '[&_.material-icons]:text-[20px] [&_.material-icons]:leading-none',
              accent.iconBg,
              accent.iconText,
            ].join(' ')}
          >
            <span className="material-icons" aria-hidden="true">
              timeline
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <div
              className={['text-[10px] font-semibold uppercase tracking-wide', accent.label].join(
                ' ',
              )}
            >
              {formatOpLabelFromDate(selectedDate)}
            </div>
            <h1 className="truncate text-xl font-bold tracking-[-0.015em] text-text-strong">
              Fluxo de Produção
            </h1>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-text-muted">
            <span className="material-icons text-base" aria-hidden="true">
              schedule
            </span>
            {diaLabel} · agora {agora}
          </span>

          <div className="relative">
            <label htmlFor="fluxo-unidade-exibicao" className="sr-only">
              Unidade de exibição
            </label>
            <select
              id="fluxo-unidade-exibicao"
              value={mode}
              onChange={(e) => setMode(e.target.value as FluxoDisplayMode)}
              className={controlInputClassName({
                size: 'compact',
                fullWidth: false,
                className: 'appearance-none pr-9',
              })}
            >
              {MODO_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span
              className="material-icons pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xl text-text-muted"
              aria-hidden="true"
            >
              expand_more
            </span>
          </div>

          <input
            type="date"
            aria-label="Data de produção"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            className={controlInputClassName({ size: 'compact', fullWidth: false })}
          />
        </div>
      </div>
    </header>
  );
}
