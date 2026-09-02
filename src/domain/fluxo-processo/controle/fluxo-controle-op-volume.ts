import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoControleOpInput } from './fluxo-controle-types';

export type FluxoControleUnidade = 'lt' | 'cx';

function planejadoLt(op: FluxoControleOpInput): number {
  if (op.assadeiras > 0) return op.assadeiras;
  return op.unidades;
}

function volumeLt(op: FluxoControleOpInput, etapa?: FluxoEtapaKey): number {
  const planejado = planejadoLt(op);
  if (etapa === 'forno' || etapa === 'emb') {
    return op.fornoMetaConfirmada ?? op.fermentacaoMetaConfirmada ?? planejado;
  }
  return planejado;
}

function volumeCx(op: FluxoControleOpInput, etapa?: FluxoEtapaKey): number {
  if (etapa === 'emb' && op.embalagemMetaConfirmada != null) {
    return op.embalagemMetaConfirmada;
  }
  const planejado = planejadoLt(op);
  const lt = volumeLt(op, etapa ?? 'emb');
  if (planejado > 0 && lt !== planejado) {
    return op.caixas * (lt / planejado);
  }
  return op.caixas;
}

/**
 * Volume da OP na unidade da planilha: assadeiras (LT) ou caixas (CX).
 * Forno/embalagem usam meta confirmada da etapa anterior (fechamento parcial).
 * Fermentação compara com a OP planejada.
 */
export function controleVolumeOp(
  op: FluxoControleOpInput,
  unidade: FluxoControleUnidade,
  etapa?: FluxoEtapaKey,
): number {
  if (unidade === 'cx') return volumeCx(op, etapa);
  return volumeLt(op, etapa);
}
