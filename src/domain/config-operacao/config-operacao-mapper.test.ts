import { describe, expect, it } from 'vitest';
import {
  ConfigOperacaoMapper,
  DEFAULT_CONFIG_OPERACAO,
} from './config-operacao-mapper';
import type { ConfigOperacaoRow } from './config-operacao-types';

const mapper = new ConfigOperacaoMapper();

const row: ConfigOperacaoRow = {
  horario_inicio_producao: '06:30:00',
  horario_fim_producao: '18:00:00',
  horario_inicio_forno: '07:00:00',
  horario_fim_forno: '18:00:00',
  horario_inicio_embalagem: '08:15:00',
  horario_fim_embalagem: '21:50:00',
  tempo_medio_fermentacao_min: 200,
  tempo_medio_resfriamento_min: 45,
  updated_at: '2026-08-17T12:00:00.000Z',
};

describe('ConfigOperacaoMapper.mapRowToSnapshot', () => {
  it('normaliza time do banco para HH:mm', () => {
    expect(mapper.mapRowToSnapshot(row)).toEqual({
      horarioInicioProducao: '06:30',
      horarioFimProducao: '18:00',
      horarioInicioForno: '07:00',
      horarioFimForno: '18:00',
      horarioInicioEmbalagem: '08:15',
      horarioFimEmbalagem: '21:50',
      tempoMedioFermentacaoMin: 200,
      tempoMedioResfriamentoMin: 45,
      updatedAt: '2026-08-17T12:00:00.000Z',
    });
  });
});

describe('ConfigOperacaoMapper.parsePatch', () => {
  it('aceita subset válido', () => {
    expect(
      mapper.parsePatch({
        horarioInicioProducao: '06:00',
        tempoMedioFermentacaoMin: 150,
      }),
    ).toEqual({
      horarioInicioProducao: '06:00',
      tempoMedioFermentacaoMin: 150,
    });
  });

  it('rejeita relógio ou minuto inválido', () => {
    expect(mapper.parsePatch({ horarioInicioProducao: '25:00' })).toBeNull();
    expect(mapper.parsePatch({ tempoMedioFermentacaoMin: 1.5 })).toBeNull();
    expect(mapper.parsePatch({})).toBeNull();
  });
});

describe('ConfigOperacaoMapper.validateSnapshot', () => {
  it('aceita defaults atuais', () => {
    expect(mapper.validateSnapshot(DEFAULT_CONFIG_OPERACAO)).toBeNull();
  });

  it('aceita janela que atravessa a meia-noite', () => {
    expect(
      mapper.validateSnapshot({
        ...DEFAULT_CONFIG_OPERACAO,
        horarioInicioEmbalagem: '07:00',
        horarioFimEmbalagem: '05:00',
      }),
    ).toBeNull();
  });

  it('rejeita janela de duração zero e tempo zero', () => {
    expect(
      mapper.validateSnapshot({
        ...DEFAULT_CONFIG_OPERACAO,
        horarioInicioProducao: '07:00',
        horarioFimProducao: '07:00',
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
