import type { RealizadoEtapaToolbarMetrics } from '@/components/Realizado/etapa/types';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

function formatToolbarOpLabel(metaOp: number, unit: string): string {
  return `OP: ${metaOp.toLocaleString('pt-BR')} ${unit}`;
}

export function buildOrdensEtapaToolbarMetrics(
  ordens: PainelOrdemEtapa[],
  unit: string,
): RealizadoEtapaToolbarMetrics {
  const produzido = ordens.reduce((sum, ordem) => sum + ordem.produzido, 0);
  const meta = ordens.reduce((sum, ordem) => sum + ordem.metaEfetiva, 0);
  const metaOp = ordens.reduce((sum, ordem) => sum + ordem.metaPlanejada, 0);
  const falta = Math.max(0, meta - produzido);
  const progressoPct = meta > 0 ? Math.min(100, (produzido / meta) * 100) : 0;

  return {
    produzido,
    meta,
    falta,
    progressoPct,
    metaAtingida: falta === 0,
    toolbarSecondaryLabel:
      metaOp !== meta ? formatToolbarOpLabel(metaOp, unit) : undefined,
  };
}
