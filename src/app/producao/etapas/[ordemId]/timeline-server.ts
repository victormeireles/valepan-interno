import { getProductionStepLogs } from '@/app/actions/producao-etapas-actions';
import type { ProductionStep } from '@/domain/types/producao-etapas';
import { buildOpTimelineSteps } from '@/lib/production/op-timeline-state';

export async function loadOpTimelineSteps(ordemId: string, activeStep: ProductionStep) {
  const logsRes = await getProductionStepLogs(ordemId);
  const logs = logsRes.success && logsRes.data ? logsRes.data : [];
  const slim = logs.map((l) => ({ etapa: l.etapa, fim: l.fim }));
  return buildOpTimelineSteps(slim, activeStep, undefined);
}
