import { describe, expect, it } from 'vitest';
import { OrdemAssadeiraTone } from './ordem-assadeira-tone';

const tone = new OrdemAssadeiraTone();

describe('OrdemAssadeiraTone', () => {
  it('devolve o mesmo tom para o mesmo nome, ignorando maiúsculas', () => {
    expect(tone.resolveIndex('Lata 40')).toBe(tone.resolveIndex('lata 40'));
  });

  it('devolve índices distintos para assadeiras diferentes', () => {
    const a = tone.resolveIndex('Lata 40');
    const b = tone.resolveIndex('Lata 24');
    const c = tone.resolveIndex('75g');
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it('mantém o índice dentro da paleta', () => {
    expect(tone.resolveIndex('Qualquer nome')).toBeGreaterThanOrEqual(0);
    expect(tone.resolveIndex('Qualquer nome')).toBeLessThan(tone.paletteSize);
  });

  it('usa tom 0 quando não há nome', () => {
    expect(tone.resolveIndex('')).toBe(0);
    expect(tone.resolveIndex('   ')).toBe(0);
  });
});
