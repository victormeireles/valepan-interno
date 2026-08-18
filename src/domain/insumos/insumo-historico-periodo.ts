import {
  addCalendarDaysISO,
  getBrazilDateISOFromInstant,
} from '@/lib/utils/date-utils';

export type InsumoHistoricoPreset = 'hoje' | 'ontem' | '3dias';

export type InsumoHistoricoPeriodo = {
  de: string;
  ate: string;
};

export function getInsumoHistoricoPresetRange(
  preset: InsumoHistoricoPreset,
  now: Date = new Date(),
): InsumoHistoricoPeriodo {
  const ate = getBrazilDateISOFromInstant(now);
  if (preset === 'hoje') return { de: ate, ate };
  if (preset === 'ontem') {
    const ontem = addCalendarDaysISO(ate, -1);
    return { de: ontem, ate: ontem };
  }
  return { de: addCalendarDaysISO(ate, -2), ate };
}

export function toInsumoHistoricoIsoRange(
  de: string,
  ate: string,
): { createdAtDe: string; createdAtAte: string } {
  return {
    createdAtDe: `${de}T00:00:00.000-03:00`,
    createdAtAte: `${ate}T23:59:59.999-03:00`,
  };
}

export const INSUMO_HISTORICO_LIMITE = 500;
