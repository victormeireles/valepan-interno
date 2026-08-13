import { describe, expect, it } from 'vitest';
import { IdListChunker } from './IdListChunker';

describe('IdListChunker', () => {
  it('remove duplicatas e divide em chunks do tamanho configurado', () => {
    const chunker = new IdListChunker(100);
    const ids = Array.from({ length: 250 }, (_, index) => `id-${index}`);
    ids.push('id-0', 'id-1');

    const chunks = chunker.chunk(ids);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it('retorna lista vazia quando não há ids', () => {
    expect(new IdListChunker().chunk([])).toEqual([]);
  });
});
