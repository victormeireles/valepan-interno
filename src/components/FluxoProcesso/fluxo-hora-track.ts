/**
 * Largura mínima do trilho de 24 horas no mobile.
 * Célula ≥ 44px (alvo de toque); o excesso rola no eixo X, não na página.
 */
export class FluxoHoraTrack {
  static readonly HOUR_COUNT = 24;
  static readonly CELL_MIN_PX = 44;

  static plotMinWidthPx(): number {
    return this.HOUR_COUNT * this.CELL_MIN_PX;
  }

  static innerMinWidthPx(sideGuttersPx: number): number {
    return this.plotMinWidthPx() + sideGuttersPx;
  }
}
