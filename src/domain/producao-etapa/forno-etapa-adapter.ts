import type { RealizadoEtapaConfig } from '@/components/Realizado/etapa/types';
import {
  buildEtapaOrdemLookup,
  buildEtapaOrdemLoteLookup,
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
};

export const buildFornoWorklistData = buildEtapaOrdemWorklistData;
export const buildFornoOrdemLookup = buildEtapaOrdemLookup;
export const buildFornoLoteLookup = buildEtapaOrdemLoteLookup;
