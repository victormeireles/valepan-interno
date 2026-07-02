'use client';

import { Card } from '@/components/ui/Card';
import {
  expectedPctForArea,
  progressPctForArea,
} from '@/domain/painel-producao/painel-producao-areas';
import type { PainelProducaoAreaView } from '@/domain/painel-producao/painel-producao-types';
import {
  formatHourFromMinutes,
  formatPainelNumber,
} from '@/components/PainelProducao/painel-producao-format';

type PainelProducaoAreaCardProps = {
  area: PainelProducaoAreaView;
  agoraMin: number;
};

function Delta({ label, value }: { label: string; value: number }) {
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
      {label}
      <span
        className={[
          'inline-flex items-center font-mono text-xs font-semibold tabular-nums',
          up ? 'text-success-fg' : 'text-danger-fg',
        ].join(' ')}
      >
        <span className="material-icons text-[13px]" aria-hidden="true">
          {up ? 'arrow_upward' : 'arrow_downward'}
        </span>
        {Math.abs(value)}%
      </span>
    </span>
  );
}

export default function PainelProducaoAreaCard({ area, agoraMin }: PainelProducaoAreaCardProps) {
  const pct = progressPctForArea(area);
  const falta = Math.max(0, area.meta - area.done);
  const encerradaComGap = area.producaoEncerrada && falta > 0;
  const expectedPct = expectedPctForArea(area, agoraMin);
  const dOntem = area.ritmoOntem > 0 ? Math.round((area.ritmo / area.ritmoOntem - 1) * 100) : 0;
  const dSemana =
    area.ritmoSemana > 0 ? Math.round((area.ritmo / area.ritmoSemana - 1) * 100) : 0;

  let eta: string | null = null;
  if (falta > 0 && area.ritmo > 0 && !area.producaoEncerrada) {
    const etaMin = agoraMin + (falta / area.ritmo) * 60;
    eta = formatHourFromMinutes(etaMin);
  }

  return (
    <Card padding="lg" className="h-full">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
          style={{
            background: `color-mix(in srgb, ${area.accent} 14%, white)`,
            color: area.accent,
          }}
        >
          <span className="material-icons text-xl" aria-hidden="true">
            {area.icon}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-text-strong">{area.name}</div>
          <div className="text-[11px] text-text-muted">{area.janela}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-bold tabular-nums text-text-strong">
            {formatPainelNumber(area.done)}
            <span className="font-normal text-text-faint"> / </span>
            <span className="text-base font-normal text-text-muted">
              {formatPainelNumber(area.meta)} {area.unit}
            </span>
          </div>
          <div
            className={[
              'mt-0.5 font-mono text-[11px] tabular-nums',
              falta === 0
                ? 'text-success-fg'
                : encerradaComGap
                  ? 'text-warning-fg'
                  : 'text-text-muted',
            ].join(' ')}
          >
            {falta === 0
              ? 'meta atingida'
              : encerradaComGap
                ? `${formatPainelNumber(falta)} ${area.unit} abaixo da meta`
                : `falta ${formatPainelNumber(falta)} ${area.unit}`}
          </div>
        </div>
      </div>

      <div className="relative mt-2.5 h-[7px] rounded-full bg-stone-100">
        <div
          className={[
            'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-[240ms] motion-safe:ease-out',
            pct >= 100 ? 'bg-success' : '',
          ].join(' ')}
          style={{
            width: `${pct}%`,
            ...(pct >= 100 ? {} : { background: area.accent }),
          }}
        />
        <span
          title={`Esperado até agora: ${expectedPct}%`}
          className="absolute bottom-[-2px] top-[-2px] w-0.5 rounded-sm bg-text-strong opacity-55"
          style={{ left: `${expectedPct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-text-faint">
        <span className="font-mono tabular-nums">{pct}% realizado</span>
        <span>esperado p/ agora: {expectedPct}%</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-stone-100 pt-2.5">
        <span className="font-mono text-sm tabular-nums text-text-body">
          <strong className="text-text-strong">{area.ritmo}</strong> {area.unit}/h
        </span>
        <span className="inline-flex gap-3">
          <Delta label="ontem" value={dOntem} />
          <Delta label="semana" value={dSemana} />
        </span>
      </div>

      {encerradaComGap ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-warning-fg">
          <span className="material-icons text-sm" aria-hidden="true">
            front_hand
          </span>
          <span>Produção encerrada — não haverá mais lotes nesta etapa</span>
        </div>
      ) : null}

      {eta ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
          <span className="material-icons text-sm" aria-hidden="true">
            flag
          </span>
          <span>
            No ritmo atual, termina{' '}
            <strong className="font-mono tabular-nums">≈{eta}</strong>
          </span>
        </div>
      ) : null}
    </Card>
  );
}
