import { describe, expect, it } from 'vitest';
import { hasProducaoDraftChanged } from './producao-draft-changes';
import type { ProducaoData } from '@/domain/types';

const emptyData: ProducaoData = {
  caixas: 0,
  pacotes: 0,
  unidades: 0,
  kg: 0,
};

const baselineEdit: ProducaoData = {
  caixas: 12,
  pacotes: 0,
  unidades: 0,
  kg: 0,
  fermentacaoFotoUrl: 'https://example.com/foto.jpg',
  fermentacaoFotoId: 'foto-1',
};

describe('hasProducaoDraftChanged', () => {
  it('não considera edição sem alterações como rascunho', () => {
    expect(hasProducaoDraftChanged({ ...baselineEdit }, baselineEdit, false)).toBe(false);
  });

  it('detecta alteração de quantidade em relação ao baseline', () => {
    expect(
      hasProducaoDraftChanged({ ...baselineEdit, caixas: 13 }, baselineEdit, false),
    ).toBe(true);
  });

  it('detecta novo lote com quantidade preenchida', () => {
    expect(hasProducaoDraftChanged({ ...emptyData, caixas: 5 }, null, false)).toBe(true);
  });

  it('detecta upload de foto pendente', () => {
    expect(hasProducaoDraftChanged({ ...baselineEdit }, baselineEdit, true)).toBe(true);
  });
});
