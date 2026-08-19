'use client';

import { assadeiraCor } from '@/domain/assadeiras/assadeira-cor';

type AssadeiraNomeBadgeProps = {
  nome: string;
  corHex?: string;
};

export default function AssadeiraNomeBadge({ nome, corHex }: AssadeiraNomeBadgeProps) {
  const label = nome.trim();
  if (!label) return null;
  const visual = assadeiraCor.visual(corHex);

  return (
    <span
      className="inline-flex max-w-[7.5rem] shrink-0 items-center rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold leading-none tabular-nums tracking-tight"
      style={visual.pill}
      title={`Assadeira ${label}`}
      aria-label={`Assadeira ${label}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
