'use client';

import type { TipoEstoqueMarca } from '@/lib/utils/cliente-display';

type TipoEstoqueMarcaBadgeProps = {
  marca: TipoEstoqueMarca;
};

export default function TipoEstoqueMarcaBadge({ marca }: TipoEstoqueMarcaBadgeProps) {
  return (
    <span
      className="
        inline-flex shrink-0 items-center justify-center
        min-h-7 min-w-7 rounded-lg border border-[#2a020d]
        bg-[#3f0313] px-1.5
        font-sans text-sm font-bold leading-none tracking-[0.04em] text-[#c6a848]
        shadow-sm
      "
      title={marca.label}
      aria-label={`Tipo de estoque ${marca.label}`}
    >
      {marca.letra}
    </span>
  );
}
