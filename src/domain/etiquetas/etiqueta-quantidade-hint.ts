import type { Quantidade } from '@/domain/types/inventario';

export function buildEtiquetaQuantidadeHint(
  unidade: 'cx' | 'pct' | 'un' | 'kg',
  produzido: Quantidade,
): string | null {
  if (unidade === 'cx' && produzido.caixas > 0) return `≈${produzido.caixas} etiquetas`;
  if (unidade === 'pct' && produzido.pacotes > 0) return `≈${produzido.pacotes} etiquetas`;
  if (unidade === 'un' && produzido.unidades > 0) return `≈${produzido.unidades} etiquetas`;
  if (unidade === 'kg' && produzido.kg > 0) return `≈${produzido.kg} kg embalados`;
  return null;
}
