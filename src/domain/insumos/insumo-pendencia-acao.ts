import type { InsumoPendenciaStatus } from '@/domain/types/insumo-estoque';

export function isPendenciaVinculavel(status: InsumoPendenciaStatus): boolean {
  return status === 'pendente' || status === 'ignorado';
}

export function isPendenciaIgnoravel(status: InsumoPendenciaStatus): boolean {
  return status === 'pendente';
}

export function isPendenciaRestauravel(status: InsumoPendenciaStatus): boolean {
  return status === 'ignorado';
}
