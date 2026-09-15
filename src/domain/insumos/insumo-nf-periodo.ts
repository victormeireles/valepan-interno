import {
  addCalendarDaysISO,
  getBrazilDateISOFromInstant,
} from '@/lib/utils/date-utils';

export type InsumoNfPeriodoPreset = '7dias' | '30dias';

export type InsumoNfPeriodo = {
  de: string;
  ate: string;
};

export function getInsumoNfPresetRange(
  preset: InsumoNfPeriodoPreset,
  now: Date = new Date(),
): InsumoNfPeriodo {
  const ate = getBrazilDateISOFromInstant(now);
  const diasAtras = preset === '7dias' ? 6 : 29;
  return { de: addCalendarDaysISO(ate, -diasAtras), ate };
}

/** Intervalo inclusivo em horário de Brasília, igual ao histórico de estoque. */
export function toInsumoNfIsoRange(
  de: string,
  ate: string,
): { inicioIso: string; fimIso: string } {
  return {
    inicioIso: `${de}T00:00:00.000-03:00`,
    fimIso: `${ate}T23:59:59.999-03:00`,
  };
}

export const INSUMO_NF_CONSULTA_LIMITE = 200;
