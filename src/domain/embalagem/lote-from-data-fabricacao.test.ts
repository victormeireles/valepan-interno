import { describe, expect, it } from 'vitest';
import { loteFromDataFabricacaoEtiqueta } from './lote-from-data-fabricacao';

describe('loteFromDataFabricacaoEtiqueta', () => {
  it('retorna o dia do ano (1 = 1º de janeiro)', () => {
    expect(loteFromDataFabricacaoEtiqueta('2026-01-01')).toBe(1);
  });

  it('calcula 08/06/2026 como dia 159', () => {
    expect(loteFromDataFabricacaoEtiqueta('2026-06-08')).toBe(159);
  });

  it('calcula 31/12/2026 como dia 365', () => {
    expect(loteFromDataFabricacaoEtiqueta('2026-12-31')).toBe(365);
  });

  it('retorna undefined para data vazia', () => {
    expect(loteFromDataFabricacaoEtiqueta('')).toBeUndefined();
    expect(loteFromDataFabricacaoEtiqueta(null)).toBeUndefined();
  });

  it('retorna undefined para data inválida', () => {
    expect(loteFromDataFabricacaoEtiqueta('2026-02-30')).toBeUndefined();
    expect(loteFromDataFabricacaoEtiqueta('invalid')).toBeUndefined();
  });
});
