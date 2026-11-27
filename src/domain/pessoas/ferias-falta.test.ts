import { describe, expect, it } from 'vitest';
import { FeriasFalta } from './ferias-falta';

describe('FeriasFalta', () => {
  const falta = new FeriasFalta();
  const ferias = { inicio: '2026-12-01', volta: '2026-12-31' };

  it('recusa o envio inteiro quando alguma data cai nas férias', () => {
    const atingidos = falta.atingidos(['2026-11-30', '2026-12-02'], [ferias]);
    expect(atingidos).toEqual([ferias]);
    expect(falta.mensagemAusencia('Ana', atingidos)).toBe('Ana está de férias de 01/12 a 30/12.');
  });

  it('ignora período cancelado e data na volta', () => {
    expect(falta.atingidos(['2026-12-02'], [{ ...ferias, canceladaEm: '2026-12-01' }])).toEqual([]);
    expect(falta.atingidos(['2026-12-31'], [ferias])).toEqual([]);
  });

  it('lista as faltas ativas em ordem cronológica', () => {
    expect(falta.mensagemFaltas(['2026-12-02'])).toBe('Cancele a falta de 02/12 antes de lançar as férias.');
    expect(falta.mensagemFaltas(['2026-12-08', '2026-12-02', '2026-12-05'])).toBe(
      'Cancele as faltas de 02/12, 05/12 e 08/12 antes de lançar as férias.',
    );
  });
});
