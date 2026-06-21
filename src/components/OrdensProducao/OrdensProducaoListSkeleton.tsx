import { ordensProducaoListScrollClass } from '@/components/OrdensProducao/ordens-producao-table-layout';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';

export default function OrdensProducaoListSkeleton() {
  return (
    <div
      className={ordensProducaoListScrollClass}
      aria-busy="true"
      aria-label="Carregando ordens de produção"
    >
      <div className="hidden md:block">
        <div className="flex gap-3 border-b border-border-default bg-stone-50 px-4 py-2.5">
          <Skeleton width="2rem" height="0.75rem" />
          <Skeleton width="30%" height="0.75rem" />
          <Skeleton width="3rem" height="0.75rem" style={{ marginLeft: 'auto' }} />
          <Skeleton width="3rem" height="0.75rem" />
          <Skeleton width="3.5rem" height="0.75rem" />
          <Skeleton width="4rem" height="0.75rem" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>

      <div className="divide-y divide-stone-100 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-3 py-3">
            <Skeleton width="2rem" height="2rem" radius="0.375rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="75%" height="0.875rem" />
              <Skeleton width="50%" height="0.75rem" />
            </div>
            <Skeleton width="2rem" height="2rem" radius="0.375rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
