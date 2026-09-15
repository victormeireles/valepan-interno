export default function MapeamentoInsumosLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="h-1 w-full animate-pulse rounded bg-amber-200" aria-hidden />
      <p className="text-sm text-stone-500" role="status" aria-live="polite">
        Carregando mapeamento…
      </p>
      <div className="h-10 max-w-sm animate-pulse rounded-xl bg-stone-200" />
      <div className="flex gap-2">
        <div className="h-10 w-28 animate-pulse rounded-xl bg-stone-200" />
        <div className="h-10 w-28 animate-pulse rounded-xl bg-stone-200" />
        <div className="h-10 w-28 animate-pulse rounded-xl bg-stone-200" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-stone-200 bg-white" />
    </div>
  );
}
