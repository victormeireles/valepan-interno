export class OrdemAssadeiraTone {
  readonly paletteSize = 6;

  resolveIndex(key: string): number {
    const normalized = key.trim().toLowerCase();
    if (!normalized) return 0;
    let hash = 0;
    for (const char of normalized) {
      hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    return Math.abs(hash) % this.paletteSize;
  }
}

export const ordemAssadeiraTone = new OrdemAssadeiraTone();
