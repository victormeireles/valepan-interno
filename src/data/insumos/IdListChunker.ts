export class IdListChunker {
  constructor(private readonly chunkSize: number = 100) {
    if (chunkSize < 1) {
      throw new Error('chunkSize deve ser >= 1');
    }
  }

  chunk(ids: string[]): string[][] {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return [];

    const chunks: string[][] = [];
    for (let offset = 0; offset < uniqueIds.length; offset += this.chunkSize) {
      chunks.push(uniqueIds.slice(offset, offset + this.chunkSize));
    }
    return chunks;
  }
}

export const idListChunker = new IdListChunker();
