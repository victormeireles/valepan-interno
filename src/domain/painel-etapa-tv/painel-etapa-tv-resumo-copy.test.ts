import { describe, expect, it } from 'vitest';
import { PainelEtapaTvResumoCopy } from './painel-etapa-tv-resumo-copy';

describe('PainelEtapaTvResumoCopy', () => {
  it('formata ISO em DD/MM com zero à esquerda', () => {
    expect(PainelEtapaTvResumoCopy.ddMm('2026-09-02')).toBe('02/09');
    expect(PainelEtapaTvResumoCopy.ddMm('2026-01-01')).toBe('01/01');
  });

  it('t1Label usa o mesmo relógio nos dois lados com en-dash', () => {
    expect(PainelEtapaTvResumoCopy.t1Label('22:00')).toBe('22h–22h');
    expect(PainelEtapaTvResumoCopy.t1Label('07:00')).toBe('7h–7h');
  });

  it('fatiaLabel junta T{n} com relógios de início e fim', () => {
    expect(
      PainelEtapaTvResumoCopy.fatiaLabel({
        numero: 1,
        inicio: '22:00',
        fim: '07:00',
      }),
    ).toBe('T1 22h–7h');
  });

  it('outraOpLine usa OP DD/MM quando há uma data', () => {
    expect(PainelEtapaTvResumoCopy.outraOpLine(800, '2026-09-01')).toBe(
      '800 de OP 01/09',
    );
  });

  it('outraOpLine cai em outra OP sem data única', () => {
    expect(PainelEtapaTvResumoCopy.outraOpLine(800, null)).toBe('800 de outra OP');
  });

  it('outraOpLine omite volume zero', () => {
    expect(PainelEtapaTvResumoCopy.outraOpLine(0, '2026-09-01')).toBeNull();
  });
});
