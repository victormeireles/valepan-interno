import type { HTMLAttributes } from 'react';

export interface MetaGapPillProps extends HTMLAttributes<HTMLSpanElement> {
  falta: number;
  unit: string;
  metaAtingida: boolean;
}

function formatQuantity(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function MetaGapPill({
  falta,
  unit,
  metaAtingida,
  className = '',
  ...rest
}: MetaGapPillProps) {
  if (metaAtingida) {
    return (
      <span
        className={[
          'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5',
          'bg-emerald-50 border-emerald-200 text-emerald-800',
          'text-[11px] font-bold uppercase tracking-[0.05em]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Meta atingida"
        {...rest}
      >
        <span aria-hidden="true">✓</span>
        Meta atingida
      </span>
    );
  }

  const formattedFalta = formatQuantity(falta);

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5',
        'bg-amber-100 border-amber-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Falta ${formattedFalta} ${unit}`}
      {...rest}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-amber-800">
        Falta
      </span>
      <span className="font-mono text-lg font-extrabold tabular-nums text-stone-900">
        {formattedFalta}
      </span>
      <span className="text-xs font-semibold text-amber-800">{unit}</span>
    </span>
  );
}
