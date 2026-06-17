import { resolveModoQuantidade } from '@/domain/ordens-producao/ordem-quantidade-label';

export type AssadeiraDisplayVariant = 'sem' | 'padrao' | 'alternativa';

export function resolveAssadeiraDisplayVariant(input: {
  assadeiraId: string;
  assadeiras: number;
  produtoDefaultAssadeiraId?: string;
}): AssadeiraDisplayVariant {
  const modo = resolveModoQuantidade(input.assadeiraId, input.assadeiras);
  if (modo === 'unidades' || !input.assadeiraId) return 'sem';
  if (
    !input.produtoDefaultAssadeiraId ||
    input.assadeiraId === input.produtoDefaultAssadeiraId
  ) {
    return 'padrao';
  }
  return 'alternativa';
}
