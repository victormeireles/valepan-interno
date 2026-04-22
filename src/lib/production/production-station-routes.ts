import type { ProductionStep } from '@/domain/types/producao-etapas';

/** Ordem das etapas operacionais (após planejamento). */
export const PRODUCTION_PIPELINE_STEPS: ProductionStep[] = [
  'massa',
  'fermentacao',
  'entrada_forno',
  'saida_forno',
  'entrada_embalagem',
  'saida_embalagem',
];

/** Segmento de URL em `/producao/etapas/[ordemId]/…`. */
export const STEP_ROUTE_SEGMENT: Record<ProductionStep, string> = {
  massa: 'massa',
  fermentacao: 'fermentacao',
  entrada_forno: 'entrada-forno',
  saida_forno: 'saida-forno',
  entrada_embalagem: 'entrada-embalagem',
  saida_embalagem: 'saida-embalagem',
};

/** Query `station` na fila (`/producao/fila?station=…`). */
export const STEP_FILA_STATION_PARAM: Record<ProductionStep, string> = {
  massa: 'massa',
  fermentacao: 'fermentacao',
  entrada_forno: 'entrada_forno',
  saida_forno: 'saida_forno',
  entrada_embalagem: 'entrada_embalagem',
  saida_embalagem: 'saida_embalagem',
};

/** Alias aceites na query (ex.: `forno` → entrada do forno). */
export function normalizeFilaStationQuery(raw: string | null | undefined): string {
  if (raw === 'forno') return 'entrada_forno';
  if (raw === 'embalagem') return 'entrada_embalagem';
  if (raw === '' || raw == null) return 'planejamento';
  return raw;
}

/** Estação atual na URL da fila (trata vazio como planejamento). */
export function currentFilaStation(searchParams: { get: (key: string) => string | null } | null | undefined): string {
  return normalizeFilaStationQuery(searchParams?.get('station'));
}

export function etapaPathForOrdem(ordemId: string, step: ProductionStep): string {
  const seg = STEP_ROUTE_SEGMENT[step];
  return `/producao/etapas/${ordemId}/${seg}`;
}

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Valida `YYYY-MM-DD` para query `data` na fila. */
export function parseFilaDataQuery(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  return ISO_DATE_ONLY.test(t) ? t : null;
}

export type FilaUrlOptions = {
  /** `YYYY-MM-DD` — filtra ordens pela data de produção (`data_producao`). */
  data?: string | null;
};

export function filaUrlForStation(station: string, options?: FilaUrlOptions): string {
  const s = normalizeFilaStationQuery(station);
  const params = new URLSearchParams();
  params.set('station', s);
  const d = options?.data != null ? String(options.data).trim() : '';
  if (d && ISO_DATE_ONLY.test(d)) {
    params.set('data', d);
  }
  return `/producao/fila?${params.toString()}`;
}

export function filaUrlForProductionStep(step: ProductionStep, options?: FilaUrlOptions): string {
  return filaUrlForStation(STEP_FILA_STATION_PARAM[step], options);
}

/** Próxima etapa na pipeline ou null se for a última. */
export function nextPipelineStep(after: ProductionStep): ProductionStep | null {
  const i = PRODUCTION_PIPELINE_STEPS.indexOf(after);
  if (i < 0 || i >= PRODUCTION_PIPELINE_STEPS.length - 1) return null;
  return PRODUCTION_PIPELINE_STEPS[i + 1]!;
}

/** Rótulos curtos para UI. */
export const STEP_LABEL_PT: Record<ProductionStep, string> = {
  massa: 'Massa',
  fermentacao: 'Fermentação',
  entrada_forno: 'Entrada forno',
  saida_forno: 'Saída forno',
  entrada_embalagem: 'Entrada embalagem',
  saida_embalagem: 'Saída embalagem',
};
