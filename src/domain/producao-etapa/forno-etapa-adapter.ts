import type { RealizadoEtapaConfig } from '@/components/Realizado/etapa/types';
import {
  buildEtapaOrdemLookup,
  buildEtapaOrdemLoteLookup,
  type BuildEtapaOrdemWorklistInput,
  buildEtapaOrdemWorklistData,
} from './etapa-ordem-worklist-adapter';

export const FORNO_ETAPA_CONFIG: RealizadoEtapaConfig = {
  title: 'Realizado',
  stageName: 'Forno',
  icon: 'local_fire_department',
  unit: 'lt',
  unitName: 'Latas',
  addLabel: 'Lote',
  summaryLabel: 'Assado no dia',
  remainingLabel: 'Falta assar',
  accent: 'brasa',
  pageBackground: '#F7F1ED',
  dashboard: 'hora',
  toolbarMetricLabel: 'Assado',
  reabrirLabel: 'Reabrir OP',
};

export function buildFornoWorklistData(
  input: Omit<BuildEtapaOrdemWorklistInput, 'etapa'>,
) {
  return buildEtapaOrdemWorklistData({
    ...input,
    etapa: 'forno',
  });
}
export const buildFornoOrdemLookup = buildEtapaOrdemLookup;
export const buildFornoLoteLookup = buildEtapaOrdemLoteLookup;
