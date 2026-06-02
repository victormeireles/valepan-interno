import type { Station } from '@/lib/utils/production-conversions';

/** Postos da fila em que «Confirmar / Adiantar etapas» existe (só no card expandido). */
export const FILA_ETAPAS_COM_ADIANTAR: readonly Station[] = [
  'entrada_forno',
  'saida_forno',
  'entrada_embalagem',
  'saida_embalagem',
] as const;

export function filaEtapaTemBotaoAdiantar(station: Station): boolean {
  return (FILA_ETAPAS_COM_ADIANTAR as readonly string[]).includes(station);
}

export const BTN_ADIANTAR_PRIMARY =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-violet-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-800 min-h-[42px] sm:min-h-[44px]';

/**
 * Variante compacta preenchida do «Confirmar / Adiantar etapas», alinhada ao visual usado nos
 * grupos de forno. Evita o botão gigante full-width nos cards de embalagem.
 */
export const BTN_ADIANTAR_PRIMARY_INLINE =
  'inline-flex items-center gap-1 rounded-md border border-violet-400 bg-violet-700 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-800';

export const BTN_ADIANTAR_SECONDARY =
  'inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50/90 px-2.5 py-1.5 text-xs font-medium text-violet-900 transition-colors hover:border-violet-300 hover:bg-violet-100';

export const BTN_ADIANTAR_SECONDARY_INLINE =
  'rounded-md border border-violet-200 bg-violet-50/90 px-2 py-1 text-xs font-medium text-violet-900 transition-colors hover:border-violet-300 hover:bg-violet-100';

export const BTN_ADIANTAR_ICON = 'material-icons text-[20px] leading-none';
export const BTN_ADIANTAR_ICON_SM = 'material-icons text-[16px] leading-none';
