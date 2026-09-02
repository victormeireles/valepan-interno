export class PainelEtapaTvResumoVisual {
  static progressoPct(feito: number, meta: number): number {
    if (meta <= 0) return 0;
    return Math.min(100, (feito / meta) * 100);
  }

  static maxVolume(volumes: number[]): number {
    return volumes.reduce((max, volume) => (volume > max ? volume : max), 0);
  }

  static barraRelativa(volume: number, maxVolume: number): number {
    if (maxVolume <= 0 || volume <= 0) return 0;
    return Math.min(100, (volume / maxVolume) * 100);
  }
}
