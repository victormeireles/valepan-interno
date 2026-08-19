import type { AssadeiraDisplayVariant } from '@/domain/ordens-producao/ordem-assadeira-display';
import { assadeiraCor, type AssadeiraCorVisual } from '@/domain/assadeiras/assadeira-cor';

export class OrdemAssadeiraVisual {
  readonly railClass =
    'relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--assadeira-cor)]';

  resolve(
    variant: AssadeiraDisplayVariant,
    corHex?: string | null,
  ): AssadeiraCorVisual | null {
    if (variant === 'sem') return null;
    return assadeiraCor.visual(corHex);
  }

  resolveRailClass(variant: AssadeiraDisplayVariant): string {
    if (variant === 'sem') return '';
    return this.railClass;
  }
}

export const ordemAssadeiraVisual = new OrdemAssadeiraVisual();
