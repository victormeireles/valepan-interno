'use client';

import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  PAINEL_ETAPA_TV_BODY_CLASS,
  PAINEL_ETAPA_TV_CHART_CELL_CLASS,
  PAINEL_ETAPA_TV_GRID_CLASS,
  PAINEL_ETAPA_TV_SHELL_CLASS,
  PAINEL_ETAPA_TV_TOP_CELL_CLASS,
} from './painel-etapa-tv-layout';

function CellSkeleton() {
  return (
    <Card padding="md" className="flex min-h-[7rem] flex-col gap-3 lg:h-full lg:min-h-0">
      <Skeleton width="40%" height="1.25rem" />
      <Skeleton width="100%" height="70%" radius="0.75rem" className="flex-1" />
    </Card>
  );
}

export default function PainelEtapaTvSkeleton() {
  return (
    <div className={PAINEL_ETAPA_TV_SHELL_CLASS}>
      <div className="flex min-h-[3.5rem] items-center gap-3 border-b border-border-default px-3 py-2">
        <Skeleton width="9rem" height="2.25rem" radius="0.5rem" />
        <Skeleton width="12rem" height="2.25rem" radius="0.5rem" />
        <Skeleton width="16rem" height="1rem" className="ml-auto hidden sm:block" />
      </div>
      <div className={PAINEL_ETAPA_TV_BODY_CLASS}>
        <div
          className={PAINEL_ETAPA_TV_GRID_CLASS}
          aria-busy="true"
          aria-label="Carregando quadro"
        >
          <div className={PAINEL_ETAPA_TV_TOP_CELL_CLASS}>
            <CellSkeleton />
          </div>
          <div className={PAINEL_ETAPA_TV_TOP_CELL_CLASS}>
            <CellSkeleton />
          </div>
          <div className={PAINEL_ETAPA_TV_TOP_CELL_CLASS}>
            <CellSkeleton />
          </div>
          <div className={PAINEL_ETAPA_TV_CHART_CELL_CLASS}>
            <CellSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
