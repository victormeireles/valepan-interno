'use client';

import type { TurnoChipPresentation } from '@/domain/producao-turno/etapa-turno-gate';

type TurnoAtivoChipProps = {
  presentation: TurnoChipPresentation;
  onClick: () => void;
};

const TONE_CLASS: Record<TurnoChipPresentation['tone'], string> = {
  amber: 'border-amber-300/90 bg-amber-100 text-amber-800',
  stone: 'border-stone-300 bg-stone-100 text-stone-700',
};

export default function TurnoAtivoChip({ presentation, onClick }: TurnoAtivoChipProps) {
  return (
    <button
      type="button"
      aria-label={presentation.ariaLabel}
      onClick={onClick}
      className={[
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3',
        'text-sm font-medium tracking-[-0.004em]',
        'transition-[background,border-color] duration-[130ms] ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        TONE_CLASS[presentation.tone],
      ].join(' ')}
    >
      <span className="material-icons text-base" aria-hidden="true">
        schedule
      </span>
      {presentation.label}
    </button>
  );
}
