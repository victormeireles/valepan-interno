import {
  ordensProducaoListGridClass,
} from '@/components/OrdensProducao/ordens-producao-list-layout';

export default function OrdensProducaoListSkeleton() {
  return (
    <div
      className="divide-y divide-stone-100 px-3"
      aria-busy="true"
      aria-label="Carregando ordens de produção"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`flex animate-pulse items-center gap-3 py-3 ${ordensProducaoListGridClass}`}
        >
          <div className="h-8 w-8 rounded bg-stone-200" />
          <div className="h-4 w-5 rounded bg-stone-200" />
          <div className="h-4 w-14 rounded bg-stone-100" />
          <div className="h-4 flex-1 rounded bg-stone-200" />
          <div className="h-4 w-12 rounded bg-stone-100" />
          <div className="h-4 w-28 rounded bg-stone-100" />
          <div className="h-4 w-10 rounded bg-stone-100" />
          <div className="hidden h-4 w-16 rounded bg-stone-100 xl:block" />
          <div className="h-8 w-8 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}
