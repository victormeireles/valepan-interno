import { describe, expect, it } from 'vitest';
import { InsumoCoberturaVisualTone } from './insumo-cobertura-visual-tone';

describe('InsumoCoberturaVisualTone', () => {
  const tone = new InsumoCoberturaVisualTone();

  it('classifica faixas de cobertura', () => {
    expect(tone.resolve(null).faixa).toBe('indefinida');
    expect(tone.resolve(0).faixa).toBe('urgente');
    expect(tone.resolve(7).faixa).toBe('urgente');
    expect(tone.resolve(8).faixa).toBe('atencao');
    expect(tone.resolve(21).faixa).toBe('atencao');
    expect(tone.resolve(22).faixa).toBe('ok');
    expect(tone.resolve(60).faixa).toBe('ok');
    expect(tone.resolve(61).faixa).toBe('folga');
  });

  it('mapeia tones do Badge por faixa', () => {
    expect(tone.resolve(5).tone).toBe('danger');
    expect(tone.resolve(14).tone).toBe('warning');
    expect(tone.resolve(40).tone).toBe('neutral');
    expect(tone.resolve(100).tone).toBe('success');
  });

  it('identifica colunas de pico', () => {
    const keys = tone.findPicoColunaKeys(
      { a: 10, b: 40, c: 40, d: 5 },
      40,
    );
    expect([...keys].sort()).toEqual(['b', 'c']);
    expect(tone.findPicoColunaKeys({ a: 1 }, 0).size).toBe(0);
  });
});
