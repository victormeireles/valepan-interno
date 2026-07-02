'use client';

import { Badge } from '@/components/ui/Badge';
import { controlInputClassName } from '@/components/ui/Input';
import {
  belowAppNavStickyTop,
  pageShellBreakoutX,
  pageShellPaddingX,
} from '@/components/ui/page-shell';
import { getEtapaAccentClasses } from '@/components/Realizado/etapa/etapa-accent';
import type { PainelProducaoData } from '@/domain/painel-producao/painel-producao-types';

type PainelProducaoHeaderProps = {
  painel: PainelProducaoData;
  selectedDate: string;
  onDateChange: (date: string) => void;
  concluidos: number;
  total: number;
};

export default function PainelProducaoHeader({
  painel,
  selectedDate,
  onDateChange,
  concluidos,
  total,
}: PainelProducaoHeaderProps) {
  const accent = getEtapaAccentClasses('vinho');

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
        className={[
          'flex w-full flex-wrap items-center gap-4 py-3',
          pageShellPaddingX,
        ].join(' ')}
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
              monitor
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <div
              className={[
                'text-[10px] font-semibold uppercase tracking-wide',
                accent.label,
              ].join(' ')}
            >
              {painel.op}
            </div>
            <h1 className="truncate text-xl font-bold tracking-[-0.015em] text-text-strong">
              Painel de Produção
            </h1>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-text-muted">
            <span className="material-icons text-base" aria-hidden="true">
              schedule
            </span>
            {painel.diaLabel} · agora {painel.agora}
          </span>
          <Badge
            tone={concluidos === total && total > 0 ? 'success' : 'neutral'}
            icon="task_alt"
            numeric
          >
            {concluidos}/{total} concluídos
          </Badge>
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
