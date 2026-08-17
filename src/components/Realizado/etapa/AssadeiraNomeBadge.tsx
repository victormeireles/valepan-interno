'use client';

type AssadeiraNomeBadgeProps = {
  nome: string;
};

export default function AssadeiraNomeBadge({ nome }: AssadeiraNomeBadgeProps) {
  const label = nome.trim();
  if (!label) return null;

  return (
    <span
      className="
        inline-flex max-w-[7.5rem] shrink-0 items-center
        rounded-md border border-stone-200 bg-stone-100
        px-1.5 py-0.5
        font-mono text-xs font-semibold leading-none tabular-nums tracking-tight text-stone-700
      "
      title={`Assadeira ${label}`}
      aria-label={`Assadeira ${label}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
