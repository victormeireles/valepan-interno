'use client';

import {
  DASHBOARD_BAR_FILL_CLASS,
  DASHBOARD_BAR_TRACK_CLASS,
} from './dashboard-styles';

type ProductionDaySummaryProps = {
  producedHeading: string;
  remainingHeading: string;
  producedLabel: string;
  metaLabel: string;
  remaining: number;
  unitLabel: string;
  progressPct: number;
  progressAriaLabel: string;
};

export default function ProductionDaySummary({
  producedHeading,
  remainingHeading,
  producedLabel,
  metaLabel,
  remaining,
  unitLabel,
  progressPct,
  progressAriaLabel,
}: ProductionDaySummaryProps) {
  return (
    <section aria-label="Resumo do dia">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <div>
          <p className="text-[13px] uppercase tracking-wide text-gray-400 sm:text-sm">
            {producedHeading}
          </p>
          <p className="text-2xl font-bold text-white tabular-nums">
            {producedLabel}
            <span className="text-gray-500 font-normal mx-1">/</span>
            <span className="text-gray-300">{metaLabel}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-gray-400 sm:text-sm">{remainingHeading}</p>
          <p className="text-xl font-semibold text-amber-300 tabular-nums">
            {remaining} {unitLabel}
          </p>
        </div>
      </div>
      <div
        className={`mt-3 ${DASHBOARD_BAR_TRACK_CLASS}`}
        role="progressbar"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progressAriaLabel}
      >
        <div
          className={`${DASHBOARD_BAR_FILL_CLASS} bg-amber-500`}
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>
    </section>
  );
}
