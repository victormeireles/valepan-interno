/**
 * Quadro de etapa: no celular empilha e rola; em TV o canvas 1920×1080
 * (painel-etapa-tv-kiosk.css) escala para caber — zoom/DPI não mudam o layout.
 */
export const PAINEL_ETAPA_TV_FRAME_CLASS = [
  'painel-tv-frame fixed inset-0 z-10 overflow-x-hidden overflow-y-auto',
  'overscroll-y-contain bg-app',
].join(' ');

export const PAINEL_ETAPA_TV_CANVAS_CLASS =
  'painel-tv-canvas flex min-h-full flex-col';

export const PAINEL_ETAPA_TV_GRID_CLASS =
  'painel-tv-grid grid w-full grid-cols-1 gap-3';

export const PAINEL_ETAPA_TV_TOP_CELL_CLASS =
  'painel-tv-top-cell flex min-h-min flex-col overflow-hidden';

export const PAINEL_ETAPA_TV_CHART_CELL_CLASS =
  'painel-tv-chart-cell overflow-hidden';

export const PAINEL_ETAPA_TV_LIST_CLASS = 'painel-tv-list flex flex-col gap-2';

export const PAINEL_ETAPA_TV_SECTION_CLASS =
  'painel-tv-section flex flex-col gap-2';

export const PAINEL_ETAPA_TV_BODY_CLASS = [
  'painel-tv-body flex flex-col px-3 py-2',
  'pb-[max(1rem,env(safe-area-inset-bottom))]',
].join(' ');
