/**
 * Quadro de etapa: no celular empilha e rola a página; a partir de lg (1024px)
 * vira kiosk de TV — 3 colunas, sem scroll interno.
 */
export const PAINEL_ETAPA_TV_GRID_CLASS = [
  'grid w-full grid-cols-1 gap-3',
  'lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.2fr)]',
  'lg:grid-rows-[auto_minmax(12rem,1fr)] lg:gap-2 lg:overflow-hidden',
].join(' ');

export const PAINEL_ETAPA_TV_TOP_CELL_CLASS = [
  'flex min-h-min flex-col overflow-hidden',
  'lg:h-full',
].join(' ');

export const PAINEL_ETAPA_TV_CHART_CELL_CLASS = [
  'overflow-hidden',
  'lg:col-span-3 lg:h-full lg:min-h-0',
].join(' ');

export const PAINEL_ETAPA_TV_LIST_CLASS = [
  'flex flex-col gap-2',
  'lg:min-h-0 lg:flex-1 lg:overflow-hidden',
].join(' ');

export const PAINEL_ETAPA_TV_SECTION_CLASS = [
  'flex flex-col gap-2',
  'lg:min-h-min lg:flex-1 lg:overflow-hidden',
].join(' ');

export const PAINEL_ETAPA_TV_BODY_CLASS = [
  'flex flex-col px-3 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]',
  'lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pb-2',
].join(' ');

export const PAINEL_ETAPA_TV_SHELL_CLASS = [
  'fixed inset-0 z-10 flex flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-app',
  'lg:overflow-hidden',
].join(' ');
