import type { ProductionStep, ProductionStepLog } from '@/domain/types/producao-etapas';
import { PRODUCTION_PIPELINE_STEPS } from '@/lib/production/production-station-routes';

export type OpTimelineStepStatus = 'pending' | 'open' | 'done' | 'highlight';

export interface OpTimelineStepVm {
  step: ProductionStep;
  label: string;
  status: OpTimelineStepStatus;
}

function labelFor(step: ProductionStep): string {
  const labels: Record<ProductionStep, string> = {
    massa: 'Massa',
    fermentacao: 'Fermentação',
    entrada_forno: 'Forno (entrada)',
    saida_forno: 'Forno (saída)',
    entrada_embalagem: 'Embalagem (entrada)',
    saida_embalagem: 'Embalagem (saída)',
  };
  return labels[step];
}

/**
 * Deriva o estado visual da linha do tempo a partir dos logs e da etapa da página atual.
 */
export function buildOpTimelineSteps(
  logs: Pick<ProductionStepLog, 'etapa' | 'fim'>[],
  activeStep: ProductionStep,
  _orderStatus?: string | null,
): OpTimelineStepVm[] {
  return PRODUCTION_PIPELINE_STEPS.map((step) => {
    const forStep = logs.filter((l) => l.etapa === step);
    const hasDone = forStep.some((l) => l.fim != null);
    const hasOpen = forStep.some((l) => l.fim == null);

    let status: OpTimelineStepStatus = 'pending';
    if (step === activeStep) {
      status = 'highlight';
    } else if (hasOpen) {
      status = 'open';
    } else if (hasDone) {
      status = 'done';
    }

    return {
      step,
      label: labelFor(step),
      status,
    };
  });
}

/** Indicador textual para a fila (compacto). */
export function opStatusHint(
  logs: Pick<ProductionStepLog, 'etapa' | 'fim'>[],
  orderStatus: string | null | undefined,
): string {
  const open = logs.filter((l) => l.fim == null);
  if (open.length > 0) {
    const e = open[0]!.etapa;
    return `Em andamento: ${labelFor(e)}`;
  }
  if (orderStatus === 'concluido') return 'Concluída';
  if (orderStatus === 'cancelado') return 'Cancelada';
  if (orderStatus === 'planejado' || !orderStatus) return 'Planejada';
  return `Etapa: ${orderStatus}`;
}
