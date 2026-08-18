import type { FluxoControleOpInput } from './fluxo-controle-types';

export type FluxoControleUnidade = 'lt' | 'cx';

/**
 * Volume da OP na unidade da planilha: assadeiras (LT) ou caixas (CX).
 * A janela de tempo da etapa é independente — a fração do relógio é a mesma.
 */
export function controleVolumeOp(
  op: FluxoControleOpInput,
  unidade: FluxoControleUnidade,
): number {
  if (unidade === 'cx') return op.caixas;
  if (op.assadeiras > 0) return op.assadeiras;
  return op.unidades;
}
