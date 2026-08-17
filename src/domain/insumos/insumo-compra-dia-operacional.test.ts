import { describe, expect, it } from 'vitest';
import {
  DIAS_UTEIS_POR_SEMANA,
  InsumoCompraDiaOperacional,
} from './insumo-compra-dia-operacional';

describe('InsumoCompraDiaOperacional', () => {
  const dia = new InsumoCompraDiaOperacional();

  it('pesos: dom=0, sáb=0.5, seg–sex=1', () => {
    expect(dia.pesoDia(0)).toBe(0);
    expect(dia.pesoDia(6)).toBe(0.5);
    expect([1, 2, 3, 4, 5].map((d) => dia.pesoDia(d))).toEqual([1, 1, 1, 1, 1]);
  });

  it('qualquer janela de 7 dias soma 5.5', () => {
    for (let start = 0; start < 7; start++) {
      expect(dia.somaPesos(start, 7)).toBeCloseTo(DIAS_UTEIS_POR_SEMANA, 10);
    }
  });

  it('lead 3d a partir de quinta (4) > sexta (5)', () => {
    const quinta = dia.somaPesos(4, 3); // qui+sex+sáb = 2.5
    const sexta = dia.somaPesos(5, 3); // sex+sáb+dom = 1.5
    expect(quinta).toBeCloseTo(2.5, 10);
    expect(sexta).toBeCloseTo(1.5, 10);
    expect(quinta).toBeGreaterThan(sexta);
  });

  it('consumoDiaUtil = media / 5.5', () => {
    expect(dia.consumoDiaUtil(11)).toBeCloseTo(2, 10);
  });

  it('demandaHorizonte lead 7 = media semanal', () => {
    const media = 70;
    const r = dia.consumoDiaUtil(media);
    expect(dia.demandaHorizonte(r, 3, 7)).toBeCloseTo(media, 10);
  });

  it('cobertura calendário: estoque=0 → 0', () => {
    expect(dia.coberturaCalendarioDias(0, 10, 1)).toBe(0);
  });

  it('cobertura: 3 dias úteis seguidos a partir de segunda', () => {
    // r=10, estoque=25 → seg 10, ter 10, qua 5/10 → 2.5 d
    expect(dia.coberturaCalendarioDias(25, 10, 1)).toBeCloseTo(2.5, 10);
  });

  it('cobertura inclui domingo sem consumir', () => {
    // sáb: 5, dom: 0 (conta 1d), seg: 5/10 → total 2.5 d
    expect(dia.coberturaCalendarioDias(10, 10, 6)).toBeCloseTo(2.5, 10);
  });

  it('diasCalendarioParaDemanda acumula pesos até a meta', () => {
    // r=10, alvo=25 a partir de seg → precisa 2.5 dias (seg+ter+meio qua)
    expect(dia.diasCalendarioParaDemanda(25, 10, 1)).toBeCloseTo(2.5, 10);
  });
});
