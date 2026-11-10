import { describe, expect, it } from 'vitest';
import { IndicadoresManutencao, type OrdemIndicador, type SaidaManual } from './indicadores-manutencao';

const PERIODO = {
  inicioPeriodo: '2026-11-01',
  fimPeriodo: '2026-11-30',
  agoraIso: '2026-11-10T15:20:00-03:00',
};

function ordem(parcial: Partial<OrdemIndicador> = {}): OrdemIndicador {
  return {
    maquinaId: 'forno',
    maquinaNome: 'Forno',
    status: 'finalizada',
    urgencia: 'maquina_parou',
    abertaEm: '2026-11-09T10:00:00-03:00',
    inicioEm: '2026-11-09T11:00:00-03:00',
    fimEm: '2026-11-09T13:00:00-03:00',
    custoPecasCentavos: 1500,
    ...parcial,
  };
}

describe('IndicadoresManutencao', () => {
  const indicadores = new IndicadoresManutencao();

  it('soma parada, execução e peças das finalizadas com fim no período', () => {
    const resultado = indicadores.agregar({
      ...PERIODO,
      ordens: [
        ordem(),
        ordem({
          abertaEm: '2026-11-09T13:00:00-03:00',
          inicioEm: '2026-11-09T13:10:00-03:00',
          fimEm: '2026-11-09T13:40:00-03:00',
          custoPecasCentavos: 250,
        }),
        ordem({
          maquinaId: 'masseira',
          maquinaNome: 'Masseira',
          abertaEm: '2026-10-31T23:00:00-03:00',
          inicioEm: '2026-11-01T00:10:00-03:00',
          fimEm: '2026-11-01T01:00:00-03:00',
          custoPecasCentavos: 5,
        }),
      ],
      saidas: [],
    });

    expect(resultado.porMaquina).toEqual([
      {
        maquinaId: 'forno',
        nome: 'Forno',
        paradaMinutos: 220,
        execucaoMinutos: 150,
        custoPecasCentavos: 1750,
      },
      {
        maquinaId: 'masseira',
        nome: 'Masseira',
        paradaMinutos: 120,
        execucaoMinutos: 50,
        custoPecasCentavos: 5,
      },
    ]);
    expect(resultado.emAndamento).toEqual([]);
  });

  it('zera a parada da finalizada que não é máquina parada', () => {
    const resultado = indicadores.agregar({
      ...PERIODO,
      ordens: [ordem({ urgencia: 'oferecendo_risco' })],
      saidas: [],
    });

    expect(resultado.porMaquina).toEqual([
      {
        maquinaId: 'forno',
        nome: 'Forno',
        paradaMinutos: 0,
        execucaoMinutos: 120,
        custoPecasCentavos: 1500,
      },
    ]);
  });

  it('deixa de fora a finalizada cujo fim cai fora do calendário de São Paulo', () => {
    const resultado = indicadores.agregar({
      ...PERIODO,
      ordens: [
        ordem({ fimEm: '2026-10-31T23:30:00-03:00' }),
        ordem({ fimEm: '2026-11-01T02:30:00Z', maquinaId: 'utc-antes' }),
        ordem({ fimEm: '2026-12-01T00:00:00-03:00', maquinaId: 'dezembro' }),
        ordem({
          maquinaId: 'virada',
          maquinaNome: 'Virada',
          abertaEm: '2026-11-30T22:30:00-03:00',
          inicioEm: '2026-11-30T23:00:00-03:00',
          fimEm: '2026-12-01T02:30:00Z',
          custoPecasCentavos: 10,
        }),
      ],
      saidas: [],
    });

    expect(resultado.porMaquina).toEqual([
      {
        maquinaId: 'virada',
        nome: 'Virada',
        paradaMinutos: 60,
        execucaoMinutos: 30,
        custoPecasCentavos: 10,
      },
    ]);
    expect(resultado.emAndamento).toEqual([]);
  });

  it('conta aberta e recebida com máquina parada só até agora', () => {
    const resultado = indicadores.agregar({
      ...PERIODO,
      ordens: [
        ordem({
          status: 'aberta',
          inicioEm: null,
          fimEm: null,
          custoPecasCentavos: 0,
          abertaEm: '2026-11-10T14:00:00-03:00',
        }),
        ordem({
          status: 'recebida',
          maquinaId: 'masseira',
          maquinaNome: 'Masseira',
          inicioEm: '2026-11-10T14:40:00-03:00',
          fimEm: null,
          custoPecasCentavos: 0,
          abertaEm: '2026-11-10T14:30:00-03:00',
        }),
        ordem({
          status: 'aberta',
          urgencia: 'oferecendo_risco',
          maquinaId: 'risco',
          fimEm: null,
          inicioEm: null,
        }),
        ordem({ status: 'cancelada', fimEm: null, maquinaId: 'cancelada' }),
        ordem({
          status: 'aberta',
          maquinaId: 'antiga',
          maquinaNome: 'Antiga',
          abertaEm: '2026-10-31T15:20:00-03:00',
          inicioEm: null,
          fimEm: null,
          custoPecasCentavos: 0,
        }),
      ],
      saidas: [],
    });

    expect(resultado.porMaquina).toEqual([]);
    expect(resultado.emAndamento).toEqual([
      { maquinaId: 'forno', nome: 'Forno', paradaMinutos: 80 },
      { maquinaId: 'masseira', nome: 'Masseira', paradaMinutos: 50 },
      { maquinaId: 'antiga', nome: 'Antiga', paradaMinutos: 14_400 },
    ]);
  });

  it('soma o ajuste da saída no período com empate para cima e ignora entrada', () => {
    const saidas: SaidaManual[] = [
      { createdAt: '2026-11-10T12:00:00-03:00', quantidade: 1.5, precoUnitarioCentavos: 1 },
      { createdAt: '2026-11-01T00:00:00-03:00', quantidade: 2, precoUnitarioCentavos: 100 },
      { createdAt: '2026-11-30T23:59:00-03:00', quantidade: 0.5, precoUnitarioCentavos: 1 },
      { createdAt: '2026-10-31T23:30:00-03:00', quantidade: 9, precoUnitarioCentavos: 999 },
      { createdAt: '2026-11-01T02:30:00Z', quantidade: 4, precoUnitarioCentavos: 50 },
      { createdAt: '2026-12-01T00:00:00-03:00', quantidade: 9, precoUnitarioCentavos: 999 },
    ];

    const resultado = indicadores.agregar({ ...PERIODO, ordens: [], saidas });

    expect(resultado.ajustesCentavos).toBe(203);
  });
});
