'use client';

type Props = {
  paesPorAssadeira: number;
};

const MAX_DOTS = 36;
const COLS = 6;

export default function AssadeiraCapacityPreview({ paesPorAssadeira }: Props) {
  const safe =
    Number.isFinite(paesPorAssadeira) && paesPorAssadeira > 0
      ? Math.floor(paesPorAssadeira)
      : 0;

  const visible = Math.min(safe, MAX_DOTS);
  const dots = Array.from({ length: visible }, (_, i) => i);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Capacidade
      </p>
      <div
        className="grid gap-1.5 w-fit motion-reduce:transition-none"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {dots.map((i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full bg-emerald-500/80"
          />
        ))}
      </div>
      <p className="sr-only">Capacidade: {safe} pães por assadeira</p>
      {safe > MAX_DOTS && (
        <p className="mt-2 text-xs text-gray-500 tabular-nums">
          Exibindo {MAX_DOTS} de {safe} pães
        </p>
      )}
      {safe === 0 && (
        <p className="text-xs text-gray-400">Informe os pães por assadeira</p>
      )}
    </div>
  );
}
