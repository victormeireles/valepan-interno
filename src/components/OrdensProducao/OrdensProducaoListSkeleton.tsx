export default function OrdensProducaoListSkeleton() {
  return (
    <div
      className="divide-y divide-stone-100"
      aria-busy="true"
      aria-label="Carregando ordens de produção"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3 animate-pulse">
          <div className="h-8 w-8 rounded bg-stone-200" />
          <div className="h-4 w-6 rounded bg-stone-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 max-w-full rounded bg-stone-200" />
            <div className="h-3 w-32 rounded bg-stone-100" />
          </div>
          <div className="hidden md:block h-4 w-24 rounded bg-stone-100" />
          <div className="hidden lg:block h-4 w-36 rounded bg-stone-100" />
          <div className="h-8 w-8 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}
