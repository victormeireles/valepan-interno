import { describe, expect, it } from 'vitest';
import {
  PAINEL_ETAPA_TV_CANVAS_CLASS,
  PAINEL_ETAPA_TV_CHART_CELL_CLASS,
  PAINEL_ETAPA_TV_FRAME_CLASS,
  PAINEL_ETAPA_TV_GRID_CLASS,
  PAINEL_ETAPA_TV_LIST_CLASS,
  PAINEL_ETAPA_TV_TOP_CELL_CLASS,
} from './painel-etapa-tv-layout';

describe('painel-etapa-tv-layout', () => {
  it('no celular o frame rola; classes de canvas ligam o kiosk CSS', () => {
    expect(PAINEL_ETAPA_TV_FRAME_CLASS).toContain('overflow-y-auto');
    expect(PAINEL_ETAPA_TV_FRAME_CLASS).toContain('painel-tv-frame');
    expect(PAINEL_ETAPA_TV_CANVAS_CLASS).toContain('painel-tv-canvas');
    expect(PAINEL_ETAPA_TV_GRID_CLASS).toContain('grid-cols-1');
    expect(PAINEL_ETAPA_TV_GRID_CLASS).toContain('painel-tv-grid');
    expect(PAINEL_ETAPA_TV_GRID_CLASS).not.toContain('lg:grid-cols-');
  });

  it('célula do gráfico no celular cresce com o plot, sem teto baixo', () => {
    expect(PAINEL_ETAPA_TV_CHART_CELL_CLASS).not.toContain('min-h-[15.5rem]');
    expect(PAINEL_ETAPA_TV_CHART_CELL_CLASS).toContain('painel-tv-chart-cell');
  });

  it('faixa de cima dimensiona pelo conteúdo, sem teto nem scroll interno', () => {
    expect(PAINEL_ETAPA_TV_TOP_CELL_CLASS).not.toContain('max-h-');
    expect(PAINEL_ETAPA_TV_TOP_CELL_CLASS).not.toContain('overflow-y-auto');
    expect(PAINEL_ETAPA_TV_LIST_CLASS).not.toContain('overflow-y-auto');
  });
});
