'use client';

function SkeletonCard() {
  return (
    <div
      className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3 space-y-2 motion-reduce:animate-none"
      aria-hidden
    >
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-2/5 rounded bg-gray-700 animate-pulse" />
        <div className="h-4 w-16 rounded bg-gray-700 animate-pulse" />
      </div>
      <div className="h-2 w-full rounded-full bg-gray-700/80 animate-pulse" />
    </div>
  );
}

function SkeletonGroup() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-5 w-32 rounded bg-gray-700 animate-pulse" />
      <div className="space-y-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export default function EmbalagemPageSkeleton() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando painel de embalagem"
    >
      <div className="min-w-0 space-y-8">
        <SkeletonGroup />
        <SkeletonGroup />
      </div>
      <div
        className="rounded-lg border border-gray-700/60 bg-gray-800/30 p-4 h-64 animate-pulse motion-reduce:animate-none"
        aria-hidden
      />
      <span className="sr-only">Carregando pedidos e lotes de embalagem…</span>
    </div>
  );
}
