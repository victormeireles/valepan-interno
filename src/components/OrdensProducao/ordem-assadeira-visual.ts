import type { AssadeiraDisplayVariant } from '@/domain/ordens-producao/ordem-assadeira-display';
import { ordemAssadeiraTone } from '@/domain/ordens-producao/ordem-assadeira-tone';

export type AssadeiraVisualTone = {
  pill: string;
  rail: string;
};

const TONES: AssadeiraVisualTone[] = [
  {
    pill: 'border-amber-300 bg-amber-100 text-amber-950',
    rail: 'relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-amber-600',
  },
  {
    pill: 'border-rose-300 bg-rose-100 text-rose-950',
    rail: 'relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-rose-700',
  },
  {
    pill: 'border-orange-300 bg-orange-100 text-orange-950',
    rail: 'relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-orange-600',
  },
  {
    pill: 'border-yellow-300 bg-yellow-100 text-yellow-950',
    rail: 'relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-yellow-600',
  },
  {
    pill: 'border-stone-300 bg-stone-200 text-stone-800',
    rail: 'relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-stone-500',
  },
  {
    pill: 'border-lime-300 bg-lime-100 text-lime-950',
    rail: 'relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-lime-700',
  },
];

export class OrdemAssadeiraVisual {
  resolve(nome: string | undefined, variant: AssadeiraDisplayVariant): AssadeiraVisualTone | null {
    if (variant === 'sem') return null;
    const index = ordemAssadeiraTone.resolveIndex(nome ?? '');
    return TONES[index] ?? TONES[0];
  }

  resolveRailClass(nome: string | undefined, variant: AssadeiraDisplayVariant): string {
    return this.resolve(nome, variant)?.rail ?? '';
  }
}

export const ordemAssadeiraVisual = new OrdemAssadeiraVisual();
