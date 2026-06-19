'use client';

import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { etapaTwoColumnGridClass } from '@/components/ui/page-shell';

function SkeletonCard() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border-default bg-surface shadow-control"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 border-l-[3px] border-l-stone-200 p-3">
        <Skeleton width="0.5rem" height="0.5rem" radius="9999px" />
        <div className="flex-1 space-y-2">
          <Skeleton width="55%" height="0.875rem" />
          <Skeleton width="30%" height="0.75rem" />
        </div>
        <Skeleton width="5rem" height="2.375rem" radius="9px" />
      </div>
    </div>
  );
}

function SkeletonGroup() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton width="8rem" height="1rem" />
      <div className="space-y-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

function SkeletonForecastCard() {
  return (
    <div
      className="rounded-xl border border-border-default bg-surface px-2.5 py-2 shadow-control"
      aria-hidden="true"
    >
      <div className="flex gap-2">
        <Skeleton width="2rem" height="2rem" radius="9px" />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height="0.625rem" />
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="100%" height="0.5rem" />
        </div>
      </div>
    </div>
  );
}

type EtapaPageSkeletonProps = {
  stageName: string;
  dashboardType: 'hora' | 'resumo';
};

export default function EtapaPageSkeleton({ stageName, dashboardType }: EtapaPageSkeletonProps) {
  return (
    <div
      className={etapaTwoColumnGridClass}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Carregando painel de ${stageName.toLowerCase()}`}
    >
      <div className="min-w-0 space-y-8">
        <SkeletonGroup />
        <SkeletonGroup />
      </div>
      <div className="space-y-2">
        {dashboardType === 'hora' ? (
          <>
            <SkeletonForecastCard />
            <SkeletonForecastCard />
            <div className="rounded-xl border border-border-default bg-surface p-4 shadow-control">
              <Skeleton width="40%" height="1rem" />
              <div className="mt-4 space-y-2">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border-default bg-surface p-4 shadow-control">
            <Skeleton width="60%" height="1.5rem" />
            <Skeleton width="100%" height="0.625rem" className="mt-4" />
          </div>
        )}
      </div>
      <span className="sr-only">Carregando pedidos e lotes de {stageName.toLowerCase()}…</span>
    </div>
  );
}
