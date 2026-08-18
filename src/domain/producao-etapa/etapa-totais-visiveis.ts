import type { RealizadoEtapaToolbarMetrics } from '@/components/Realizado/etapa/types';
import { buildOrdensEtapaToolbarMetrics } from './build-etapa-toolbar-metrics';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

/**
 * Totais da toolbar em LT: só OPs do recorte visível, sem misturar UN (Broa).
 */
export function ordensParaTotaisLt(ordens: PainelOrdemEtapa[]): PainelOrdemEtapa[] {
  return ordens.filter(
    (ordem) => ordem.unidade === 'lt' && ordem.incluirNosTotais !== false,
  );
}

/**
 * Meta = OP visível do dia. Produzido = apontamentos do dia civil (mesma língua do gráfico).
 */
export function toolbarMetricsEtapaDiaCivil(
  ordens: PainelOrdemEtapa[],
  unit: string,
  snapshots: Array<{ assadeiras: number }>,
): RealizadoEtapaToolbarMetrics {
  const base = buildOrdensEtapaToolbarMetrics(ordensParaTotaisLt(ordens), unit);
  const produzido = snapshots.reduce((sum, item) => sum + item.assadeiras, 0);
  const falta = Math.max(0, base.meta - produzido);
  return {
    ...base,
    produzido,
    falta,
    progressoPct: base.meta > 0 ? Math.min(100, (produzido / base.meta) * 100) : 0,
    metaAtingida: falta === 0,
  };
}

