import { Skeleton } from '@/components/ui/Skeleton';

export function ConsumoInsumosLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton width="14rem" height="1.75rem" radius="0.5rem" />
        <Skeleton width="28rem" height="1rem" radius="0.5rem" className="max-w-full" />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <Skeleton height="2.75rem" radius="0.75rem" />
          <Skeleton height="2.75rem" radius="0.75rem" />
          <Skeleton height="2.75rem" radius="0.75rem" />
          <Skeleton height="2.75rem" radius="0.75rem" />
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm"
        role="status"
      >
        <span className="material-icons animate-spin text-base" aria-hidden="true">
          sync
        </span>
        Carregando visão de consumo...
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-stone-100 px-3 py-3 last:border-b-0"
          >
            <Skeleton width="40%" height="0.875rem" />
            <Skeleton width="3.5rem" height="0.875rem" style={{ marginLeft: 'auto' }} />
            <Skeleton width="3rem" height="0.875rem" />
            <Skeleton width="3rem" height="0.875rem" />
            <Skeleton width="3rem" height="0.875rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
