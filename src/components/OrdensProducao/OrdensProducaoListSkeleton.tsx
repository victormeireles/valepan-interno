import { ordensProducaoListScrollClass } from '@/components/OrdensProducao/ordens-producao-table-layout';

export default function OrdensProducaoListSkeleton() {
  return (
    <div
      className={`${ordensProducaoListScrollClass} px-3`}
      aria-busy="true"
      aria-label="Carregando ordens de produção"
    >
      <div className="hidden animate-pulse md:block">
        <div className="flex gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2.5">
          {['w-8', 'w-6', 'w-[9%]', 'w-[20%]', 'w-[13%]', 'w-[8%]', 'w-[8%]', 'w-[9%]', 'w-[7%]', 'w-[14%]', 'w-8'].map(
            (width, index) => (
              <div key={index} className={`h-3 shrink-0 rounded bg-stone-200 ${width}`} />
            ),
          )}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-stone-100 py-3">
            <div className="h-8 w-8 shrink-0 rounded bg-stone-200" />
            <div className="h-4 w-6 shrink-0 rounded bg-stone-100" />
            <div className="h-4 w-[9%] shrink-0 rounded bg-stone-100" />
            <div className="h-4 w-[20%] shrink-0 rounded bg-stone-200" />
            <div className="h-4 w-[13%] shrink-0 rounded bg-stone-100" />
            <div className="h-4 w-[8%] shrink-0 rounded bg-stone-100" />
            <div className="h-4 w-[8%] shrink-0 rounded bg-stone-100" />
            <div className="h-4 w-[9%] shrink-0 rounded bg-stone-100" />
            <div className="h-4 w-[7%] shrink-0 rounded bg-stone-100" />
            <div className="hidden h-4 w-[14%] shrink-0 rounded bg-stone-100 xl:block" />
            <div className="h-8 w-8 shrink-0 rounded bg-stone-200" />
          </div>
        ))}
      </div>

      <div className="divide-y divide-stone-100 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex animate-pulse items-center gap-3 py-3">
            <div className="h-8 w-8 rounded bg-stone-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-stone-200" />
              <div className="h-3 w-1/2 rounded bg-stone-100" />
            </div>
            <div className="h-8 w-8 rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
