'use client';

/**
 * Barra fina de progresso da OP (fila compacta): encaixa entre nome e selo sem aumentar altura do card.
 */
export default function FilaOrdemProducaoProgressBar({
  pct,
  className = '',
}: {
  pct: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={`relative h-1.5 min-w-[2.25rem] flex-1 overflow-hidden rounded-full bg-slate-200/90 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      title={`Progresso da ordem: ${Math.round(clamped)}%`}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-violet-500 transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
