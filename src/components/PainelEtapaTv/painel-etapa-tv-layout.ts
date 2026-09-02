/**
 * Grade do quadro de TV: resumo + último + próximas no topo, gráfico embaixo.
 * Ativa a partir de 480px para TVs com zoom/escala alta ainda receberem colunas.
 */
export const PAINEL_ETAPA_TV_GRID_CLASS = [
  'grid min-h-0 flex-1 gap-2 overflow-hidden',
  'grid-cols-1 grid-rows-[auto_auto_auto_minmax(0,1fr)]',
  'min-[480px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.2fr)]',
  'min-[480px]:grid-rows-[minmax(0,auto)_minmax(0,1fr)]',
].join(' ');

export const PAINEL_ETAPA_TV_TOP_CELL_CLASS = [
  'min-h-0 h-full overflow-hidden',
  'min-[480px]:max-h-[min(42vh,24rem)]',
].join(' ');

export const PAINEL_ETAPA_TV_CHART_CELL_CLASS = [
  'min-h-0 h-full overflow-hidden',
  'min-[480px]:col-span-3',
].join(' ');

export const PAINEL_ETAPA_TV_SHELL_CLASS =
  'fixed inset-0 z-10 flex flex-col overflow-hidden bg-app';
