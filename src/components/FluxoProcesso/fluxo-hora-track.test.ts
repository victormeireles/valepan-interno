import { describe, expect, it } from 'vitest';

import { FluxoHoraTrack } from '@/components/FluxoProcesso/fluxo-hora-track';

describe('FluxoHoraTrack', () => {
  it('reserva 44px por hora no gráfico', () => {
    expect(FluxoHoraTrack.plotMinWidthPx()).toBe(24 * 44);
  });

  it('soma gutters laterais do heatmap (rótulo + total)', () => {
    expect(FluxoHoraTrack.innerMinWidthPx(108 + 84)).toBe(24 * 44 + 192);
  });
});
