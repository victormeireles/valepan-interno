import type { InsumoConversaoVisual } from '@/domain/types/insumo-estoque';
import { InsumoUnidadeConversaoFormatter } from '@/domain/insumos/insumo-unidade-conversao-formatter';

export function formatInsumoQuantidadeOperacional(
  quantidadeEstoque: number,
  unidadeEstoque: string,
  conversao: InsumoConversaoVisual | null | undefined,
  options?: { arredondado?: boolean },
): string {
  const formatter = InsumoUnidadeConversaoFormatter.create(
    unidadeEstoque,
    conversao ?? null,
  );
  return formatter.formatQuantidade(quantidadeEstoque, {
    arredondado: options?.arredondado,
  }).primaria;
}
