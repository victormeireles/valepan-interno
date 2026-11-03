import { describe, expect, it } from 'vitest';
import { RemuneracaoData, RemuneracaoQuadro, type RemuneracaoVigencia } from './remuneracao-quadro';

function vigencia(id: string, inicio: string): RemuneracaoVigencia {
  return {
    id,
    inicio,
    salarioCentavos: 100000,
    valeTransporteCentavos: 0,
    valeAlimentacaoCentavos: 0,
    planoSaude: false,
  };
}

describe('RemuneracaoQuadro', () => {
  const quadro = new RemuneracaoQuadro();

  it('sem linha deixa hoje não informado', () => {
    expect(quadro.montar([], '2026-03-01')).toEqual({ vigente: null, linhas: [] });
  });

  it('escolhe o início mais recente até hoje e marca o futuro', () => {
    const resultado = quadro.montar(
      [vigencia('jan', '2026-01-01'), vigencia('mar', '2026-03-01'), vigencia('jun', '2026-06-01')],
      '2026-04-15',
    );
    expect(resultado.vigente?.id).toBe('mar');
    expect(resultado.linhas.map((linha) => [linha.id, linha.marca])).toEqual([
      ['jun', 'futura'],
      ['mar', 'vigente'],
      ['jan', null],
    ]);
  });

  it('só com datas futuras não há vigente', () => {
    const resultado = quadro.montar([vigencia('jun', '2026-06-01')], '2026-04-15');
    expect(resultado.vigente).toBeNull();
    expect(resultado.linhas[0].marca).toBe('futura');
  });

  it('início igual a hoje é vigente', () => {
    const resultado = quadro.montar([vigencia('hoje', '2026-04-15')], '2026-04-15');
    expect(resultado.vigente?.id).toBe('hoje');
    expect(resultado.linhas[0].marca).toBe('vigente');
  });

  it('sem a linha mais nova, a anterior passa a valer', () => {
    const resultado = quadro.montar([vigencia('jan', '2026-01-01')], '2026-04-15');
    expect(resultado.vigente?.id).toBe('jan');
  });
});

describe('RemuneracaoData', () => {
  const data = new RemuneracaoData();

  it('exibe e confirma em dia, mês e ano', () => {
    expect(data.exibir('2026-03-01')).toBe('01/03/2026');
    expect(data.confirmacao('2026-03-01')).toBe('Apagar a vigência de 01/03/2026?');
  });
});
