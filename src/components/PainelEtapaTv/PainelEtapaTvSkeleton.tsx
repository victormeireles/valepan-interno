'use client';

import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { pageShellBreakoutX } from '@/components/ui/page-shell';

function CellSkeleton() {
  return (
    <Card padding="md" className="flex h-full min-h-0 flex-col gap-3">
      <Skeleton width="40%" height="1.25rem" />
      <Skeleton width="100%" height="70%" radius="0.75rem" className="flex-1" />
    </Card>
  );
}

export default function PainelEtapaTvSkeleton() {
  return (
    <div className={`${pageShellBreakoutX} flex min-h-dvh flex-col overflow-hidden px-3 py-2`}>
      <div className="mb-2 flex min-h-[3.5rem] items-center gap-3 border-b border-border-default pb-2">
        <Skeleton width="9rem" height="2.25rem" radius="0.5rem" />
        <Skeleton width="12rem" height="2.25rem" radius="0.5rem" />
        <Skeleton width="16rem" height="1rem" className="ml-auto" />
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] lg:grid-rows-2"
        aria-busy="true"
        aria-label="Carregando quadro"
      >
        <CellSkeleton />
        <CellSkeleton />
        <CellSkeleton />
        <CellSkeleton />
      </div>
    </div>
  );
}
