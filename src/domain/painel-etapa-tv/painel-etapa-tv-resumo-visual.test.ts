import { describe, expect, it } from 'vitest';
import { PainelEtapaTvResumoVisual } from './painel-etapa-tv-resumo-visual';

describe('PainelEtapaTvResumoVisual', () => {
  it('progressoPct zera sem meta e cap em 100', () => {
    expect(PainelEtapaTvResumoVisual.progressoPct(785, 0)).toBe(0);
    expect(PainelEtapaTvResumoVisual.progressoPct(200, 100)).toBe(100);
  });

  it('progressoPct usa a fração feito/meta', () => {
    expect(PainelEtapaTvResumoVisual.progressoPct(785, 1781)).toBeCloseTo(44.08, 1);
  });

  it('maxVolume ignora lista vazia e pega o maior', () => {
    expect(PainelEtapaTvResumoVisual.maxVolume([])).toBe(0);
    expect(PainelEtapaTvResumoVisual.maxVolume([0, 1217, 0])).toBe(1217);
  });

  it('barraRelativa escala pelo maior turno', () => {
    expect(PainelEtapaTvResumoVisual.barraRelativa(0, 1217)).toBe(0);
    expect(PainelEtapaTvResumoVisual.barraRelativa(1217, 1217)).toBe(100);
    expect(PainelEtapaTvResumoVisual.barraRelativa(510, 850)).toBeCloseTo(60, 0);
  });
});
