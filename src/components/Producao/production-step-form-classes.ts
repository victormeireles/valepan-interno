/**
 * Classes Tailwind compartilhadas — formulários de etapas de produção (padrão etapa Massa).
 */

export const STEP_GRID_4_BTN =
  'flex h-9 min-h-[40px] w-full min-w-0 touch-manipulation items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-100 px-0.5 text-xs font-bold tabular-nums leading-tight text-gray-800 hover:border-blue-400 hover:bg-white active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-35 sm:h-10 sm:min-h-10 sm:px-1 sm:text-sm';

export const FORM_SECTION_TITLE =
  'block text-base font-bold leading-snug tracking-tight text-gray-900 sm:text-lg';

export const FORM_SECTION_SUB =
  'mt-0.5 text-xs font-medium tabular-nums text-gray-500 sm:text-sm';

export const FORM_FIELD_LABEL = 'block text-sm font-semibold text-gray-900 sm:text-base';

/** Campo texto/numérico central (receitas, °C, pH, etc.) */
export const INPUT_COMPACT_PRIMARY =
  'w-full min-h-[40px] rounded-lg border-2 border-gray-200 bg-gray-50 px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 touch-manipulation sm:min-h-10 sm:px-3 sm:py-2 sm:text-base';

/** Select / campo alinhado à esquerda */
export const INPUT_COMPACT_LINE =
  'w-full min-h-[40px] rounded-lg border-2 border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:min-h-0 sm:px-3 sm:py-2 sm:text-sm';

/** Cartão de bloco do formulário */
export const CARD_FORM_BLOCK =
  'space-y-2 rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-xl sm:p-4';

export const PRODUCTION_STEP_DENSE_SHELL = {
  outerClassName: 'max-w-2xl mx-auto px-2 py-1.5 sm:p-3',
  contentClassName: 'p-2.5 space-y-2.5 sm:p-5 sm:space-y-4',
} as const;
