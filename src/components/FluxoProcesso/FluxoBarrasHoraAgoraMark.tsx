'use client';

/**
 * Marcador vertical "agora" na coluna da hora atual (somente dia de hoje).
 */
export default function FluxoBarrasHoraAgoraMark() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-amber-600" />
      <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-mono text-amber-800">
        agora
      </span>
    </div>
  );
}
