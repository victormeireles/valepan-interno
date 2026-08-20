import { describe, expect, it } from 'vitest';
import {
  ConfigOperacaoMapper,
  DEFAULT_CONFIG_OPERACAO,
  deriveEtapaJanela,
} from './config-operacao-mapper';
import type {
  ConfigOperacaoRow,
  ConfigOperacaoTurno,
} from './config-operacao-types';

const mapper = new ConfigOperacaoMapper();

const row: ConfigOperacaoRow = {
  tempo_medio_fermentacao_min: 200,
  tempo_medio_resfriamento_min: 45,
  updated_at: '2026-08-17T12:00:00.000Z',
};

const t1 = (
  etapa: ConfigOperacaoTurno['etapa'],
  inicio: string,
  fim: string,
): ConfigOperacaoTurno => ({ etapa, numero: 1, inicio, fim });

const overnightTurnos: ConfigOperacaoTurno[] = [
  t1('fermentacao', '07:00', '18:00'),
  t1('forno', '07:00', '18:00'),
  { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '22:00' },
  { etapa: 'embalagem', numero: 2, inicio: '22:00', fim: '05:00' },
];

describe('ConfigOperacaoMapper.composeSnapshot', () => {
  it('deriva fermentação 07–18, forno 07–18, embalagem 07–05 quando T1 07–22 e T2 22–05', () => {
    const snapshot = mapper.composeSnapshot(row, [
      { etapa: 'fermentacao', numero: 1, inicio: '07:00:00', fim: '18:00:00' },
      { etapa: 'forno', numero: 1, inicio: '07:00:00', fim: '18:00:00' },
      { etapa: 'embalagem', numero: 1, inicio: '07:00:00', fim: '22:00:00' },
      { etapa: 'embalagem', numero: 2, inicio: '22:00:00', fim: '05:00:00' },
    ]);

    expect(snapshot.horarioInicioProducao).toBe('07:00');
    expect(snapshot.horarioFimProducao).toBe('18:00');
    expect(snapshot.horarioInicioForno).toBe('07:00');
    expect(snapshot.horarioFimForno).toBe('18:00');
    expect(snapshot.horarioInicioEmbalagem).toBe('07:00');
    expect(snapshot.horarioFimEmbalagem).toBe('05:00');
    expect(snapshot.tempoMedioFermentacaoMin).toBe(200);
    expect(snapshot.tempoMedioResfriamentoMin).toBe(45);
    expect(snapshot.updatedAt).toBe('2026-08-17T12:00:00.000Z');
  });
});

describe('deriveEtapaJanela', () => {
  it('usa T1.inicio e o fim do último turno', () => {
    expect(
      deriveEtapaJanela([
        { numero: 1, inicio: '07:00', fim: '22:00' },
        { numero: 2, inicio: '22:00', fim: '05:00' },
      ]),
    ).toEqual({ inicio: '07:00', fim: '05:00' });
  });
});

describe('ConfigOperacaoMapper.turnosDaEtapa', () => {
  it('devolve só numero/inicio/fim da etapa', () => {
    const snapshot = mapper.composeSnapshot(row, overnightTurnos);
    expect(mapper.turnosDaEtapa(snapshot, 'embalagem')).toEqual([
      { numero: 1, inicio: '07:00', fim: '22:00' },
      { numero: 2, inicio: '22:00', fim: '05:00' },
    ]);
  });
});

describe('ConfigOperacaoMapper.parsePatch', () => {
  it('aceita turnos e tempo médio', () => {
    expect(
      mapper.parsePatch({
        turnos: overnightTurnos,
        tempoMedioFermentacaoMin: 150,
      }),
    ).toEqual({
      turnos: overnightTurnos,
      tempoMedioFermentacaoMin: 150,
    });
  });

  it('rejeita relógio inválido', () => {
    expect(
      mapper.parsePatch({
        turnos: [t1('fermentacao', '25:00', '18:00')],
      }),
    ).toBeNull();
    expect(mapper.parsePatch({ tempoMedioFermentacaoMin: 1.5 })).toBeNull();
    expect(mapper.parsePatch({})).toBeNull();
  });

  it('não aceita mais horarioInicioProducao', () => {
    expect(mapper.parsePatch({ horarioInicioProducao: '06:00' })).toBeNull();
    expect(
      mapper.parsePatch({
        horarioInicioProducao: '06:00',
        tempoMedioFermentacaoMin: 150,
      }),
    ).toEqual({ tempoMedioFermentacaoMin: 150 });
  });
});

describe('ConfigOperacaoMapper.mergeSnapshot', () => {
  it('substitui turnos inteiro se o patch trouxer turnos', () => {
    const merged = mapper.mergeSnapshot(DEFAULT_CONFIG_OPERACAO, {
      turnos: overnightTurnos,
    });
    expect(merged.turnos).toEqual(overnightTurnos);
    expect(merged.turnos).not.toBe(DEFAULT_CONFIG_OPERACAO.turnos);
  });
});

describe('ConfigOperacaoMapper.validateSnapshot', () => {
  it('aceita defaults atuais', () => {
    expect(mapper.validateSnapshot(DEFAULT_CONFIG_OPERACAO)).toBeNull();
  });

  it('recusa T3 sem T2, sobreposição, T1 ausente e tempos ≤ 0', () => {
    expect(
      mapper.validateSnapshot({
        ...DEFAULT_CONFIG_OPERACAO,
        turnos: [
          t1('fermentacao', '07:00', '18:00'),
          t1('forno', '07:00', '18:00'),
          t1('embalagem', '07:00', '14:00'),
          { etapa: 'embalagem', numero: 3, inicio: '22:00', fim: '05:00' },
        ],
      }),
    ).toBe('Ligue o 2º turno antes do 3º.');

    expect(
      mapper.validateSnapshot({
        ...DEFAULT_CONFIG_OPERACAO,
        turnos: [
          t1('fermentacao', '07:00', '14:00'),
          { etapa: 'fermentacao', numero: 2, inicio: '13:00', fim: '22:00' },
          t1('forno', '07:00', '18:00'),
          t1('embalagem', '07:00', '21:50'),
        ],
      }),
    ).toBe('Os turnos desta etapa se sobrepõem.');

    expect(
      mapper.validateSnapshot({
        ...DEFAULT_CONFIG_OPERACAO,
        turnos: [t1('forno', '07:00', '18:00'), t1('embalagem', '07:00', '21:50')],
      }),
    ).toMatch(/1º turno/i);

    expect(
      mapper.validateSnapshot({
        ...DEFAULT_CONFIG_OPERACAO,
        tempoMedioFermentacaoMin: 0,
      }),
    ).toMatch(/fermentação/i);
    expect(
      mapper.validateSnapshot({
        ...DEFAULT_CONFIG_OPERACAO,
        tempoMedioResfriamentoMin: 0,
      }),
    ).toMatch(/resfriamento/i);
  });
});

describe('ConfigOperacaoMapper.snapshotToRow', () => {
  it('só devolve os dois tempos médios', () => {
    expect(mapper.snapshotToRow(DEFAULT_CONFIG_OPERACAO)).toEqual({
      tempo_medio_fermentacao_min: 180,
      tempo_medio_resfriamento_min: 60,
    });
  });
});
