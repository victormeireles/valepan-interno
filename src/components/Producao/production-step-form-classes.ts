/**
 * Classes Tailwind compartilhadas — formulários de etapas de produção (padrão etapa Massa).
 */

/** Stepper horizontal (− | valor | +): borda única, sombra leve, foco no grupo. `overflow-visible` evita cortar o + em colunas estreitas. */
export const H_STEPPER_SHELL =
  'flex min-h-[44px] w-full min-w-0 items-stretch overflow-visible rounded-xl border-2 border-gray-200 bg-white shadow-sm shadow-gray-900/[0.06] transition-[border-color,box-shadow] focus-within:border-blue-500 focus-within:shadow-md focus-within:shadow-blue-500/[0.12] focus-within:ring-2 focus-within:ring-blue-500/25';

/** Botão lateral do stepper (altura mínima 44px, largura fixa para toque). */
export const H_STEPPER_BTN =
  'flex w-12 min-w-12 max-w-12 shrink-0 touch-manipulation select-none items-center justify-center border-gray-200 bg-gradient-to-b from-slate-50 to-slate-100/95 text-[1.35rem] font-light leading-none tracking-tight text-slate-700 transition-colors hover:from-slate-100 hover:to-slate-50 active:bg-slate-200/90 disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:z-[1] focus-visible:bg-slate-100';

/** Mesmo padrão, mais estreito — grids 2 colunas no mobile. */
export const H_STEPPER_BTN_COMPACT =
  'flex h-[44px] w-10 min-w-10 max-w-10 shrink-0 touch-manipulation select-none items-center justify-center border-gray-200 bg-gradient-to-b from-slate-50 to-slate-100/95 text-[1.2rem] font-light leading-none tracking-tight text-slate-700 transition-colors hover:from-slate-100 hover:to-slate-50 active:bg-slate-200/90 disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:z-[1] focus-visible:bg-slate-100';

export const H_STEPPER_BTN_LEFT = `${H_STEPPER_BTN} border-r`;

export const H_STEPPER_BTN_RIGHT = `${H_STEPPER_BTN} border-l`;

export const H_STEPPER_BTN_COMPACT_LEFT = `${H_STEPPER_BTN_COMPACT} border-r`;

export const H_STEPPER_BTN_COMPACT_RIGHT = `${H_STEPPER_BTN_COMPACT} border-l`;

/** Área do valor entre os botões: `basis-0` evita o flex comer a largura dos botões +/−. */
export const H_STEPPER_MIDDLE = 'relative min-w-0 flex-1 basis-0';

/** Campo central dentro do shell (sem borda própria). */
export const H_STEPPER_INPUT =
  'min-h-[44px] w-full min-w-0 flex-1 border-0 bg-white px-2 py-2 text-center text-sm font-semibold tabular-nums text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-0 touch-manipulation sm:px-3 sm:text-base';

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
