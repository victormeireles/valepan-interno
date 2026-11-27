import { describe, expect, it } from 'vitest';
import { FaltaDiaContavel } from './falta-dia-contavel';

describe('FaltaDiaContavel', () => {
  const contagem = new FaltaDiaContavel();

  it('descarta a falta no dia do desligamento e nos dias seguintes', () => {
    const itens = [
      { id: 'antes', data: '2026-11-04', dataDesligamento: '2026-11-05' },
      { id: 'no-dia', data: '2026-11-05', dataDesligamento: '2026-11-05' },
      { id: 'depois', data: '2026-11-06', dataDesligamento: '2026-11-05' },
    ];

    expect(contagem.aplicar(itens).map((item) => item.id)).toEqual(['antes']);
  });

  it('mantém a falta quando não há data de desligamento', () => {
    const item = { data: '2026-11-05', dataDesligamento: null };
    expect(contagem.conta(item)).toBe(true);
  });
});
