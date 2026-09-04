import { describe, expect, it } from 'vitest';
import { PAINEL_FETCH_INIT, PainelCargaRequest } from './painel-fetch';

describe('PainelCargaRequest', () => {
  it('busca painel sem cache', () => {
    expect(PAINEL_FETCH_INIT.cache).toBe('no-store');
  });

  it('inclui a data e um cache-buster na query', () => {
    const url = PainelCargaRequest.url('/api/painel/fermentacao/carga', '2026-09-04', 1_700_000_000_000);
    expect(url).toBe(
      '/api/painel/fermentacao/carga?date=2026-09-04&_=1700000000000',
    );
  });
});
