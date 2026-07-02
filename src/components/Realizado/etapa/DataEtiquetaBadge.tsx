'use client';

type DataEtiquetaBadgeProps = {
  data: string;
};

export default function DataEtiquetaBadge({ data }: DataEtiquetaBadgeProps) {
  return (
    <span
      className="
        inline-flex shrink-0 items-center
        rounded-md border border-amber-300/80 bg-amber-100
        px-2 py-0.5
        font-mono text-sm font-bold leading-none tabular-nums tracking-tight text-amber-900
        shadow-xs
      "
      title={`Data da etiqueta: ${data}`}
      aria-label={`Data da etiqueta: ${data}`}
    >
      {data}
    </span>
  );
}
