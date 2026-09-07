/**
 * Quadro de TV: canvas fixo 1920×1080, escalado para caber no viewport.
 * Zoom do Chrome, DPI do Windows e TVs 720p/1080p/4K passam a mostrar o mesmo layout.
 */
export class PainelEtapaTvFit {
  static readonly DESIGN_WIDTH_PX = 1920;
  static readonly DESIGN_HEIGHT_PX = 1080;
  static readonly MIN_WIDTH_PX = 768;
  static readonly MIN_HEIGHT_PX = 480;

  static mediaQuery(): string {
    return (
      `(min-width: ${this.MIN_WIDTH_PX}px) and ` +
      `(min-height: ${this.MIN_HEIGHT_PX}px) and ` +
      `(orientation: landscape)`
    );
  }

  static isKiosk(width: number, height: number): boolean {
    return (
      width >= this.MIN_WIDTH_PX &&
      height >= this.MIN_HEIGHT_PX &&
      width >= height
    );
  }

  static scale(width: number, height: number): number {
    return Math.min(
      width / this.DESIGN_WIDTH_PX,
      height / this.DESIGN_HEIGHT_PX,
    );
  }
}
