import { describe, expect, it } from 'vitest';
import { PainelEtapaTvTurnoVigente } from './painel-etapa-tv-turno-vigente';

const fatias = [
  { numero: 1 as const, inicio: '22:00', fim: '07:00' },
  { numero: 2 as const, inicio: '07:00', fim: '16:00' },
  { numero: 3 as const, inicio: '13:00', fim: '22:00' },
];

describe('PainelEtapaTvTurnoVigente', () => {
  it('marca T1 de madrugada', () => {
    expect(PainelEtapaTvTurnoVigente.primeiro(fatias, 3 * 60)?.numero).toBe(1);
  });

  it('marca T2 de manhã e T3 à tarde', () => {
    expect(PainelEtapaTvTurnoVigente.primeiro(fatias, 10 * 60)?.numero).toBe(2);
    expect(PainelEtapaTvTurnoVigente.primeiro(fatias, 16 * 60 + 41)?.numero).toBe(3);
  });

  it('na sobreposição T2/T3 devolve os dois', () => {
    expect([...PainelEtapaTvTurnoVigente.numeros(fatias, 14 * 60)]).toEqual([2, 3]);
  });

  it('fora de qualquer janela não marca', () => {
    const soT2 = [{ numero: 2 as const, inicio: '07:00', fim: '16:00' }];
    expect(PainelEtapaTvTurnoVigente.primeiro(soT2, 20 * 60)).toBeNull();
  });
});
