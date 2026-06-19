import type { ProductionStatus } from '@/domain/types/realizado';
import { getProductionStatus } from '@/domain/types/realizado';

export function getEtapaProductionStatus(
  produzido: number,
  meta: number,
  override?: ProductionStatus,
): ProductionStatus {
  return override ?? getProductionStatus(produzido, meta);
}

export function etapaStatusStyles(status: ProductionStatus) {
  switch (status) {
    case 'not-started':
      return {
        dot: 'bg-danger',
        border: 'border-l-danger',
        fill: 'bg-danger',
      };
    case 'partial':
      return {
        dot: 'bg-accent',
        border: 'border-l-accent',
        fill: 'bg-accent',
      };
    case 'complete':
      return {
        dot: 'bg-success',
        border: 'border-l-success',
        fill: 'bg-success',
      };
  }
}
