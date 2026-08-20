import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoTurno } from '@/domain/config-operacao/config-operacao-types';
import { OperacaoTurnoDraftManager } from './operacao-turno-draft';

const manager = new OperacaoTurnoDraftManager();

const t = (
  etapa: ConfigOperacaoTurno['etapa'],
  numero: ConfigOperacaoTurno['numero'],
  inicio: string,
  fim: string,
): ConfigOperacaoTurno => ({ etapa, numero, inicio, fim });

describe('OperacaoTurnoDraftManager.fromTurnos', () => {
  it('monta T1 obrigatório e omite t2/t3 quando a etapa só tem 1º turno', () => {
    const drafts = manager.fromTurnos(DEFAULT_CONFIG_OPERACAO.turnos);

    expect(drafts.fermentacao).toEqual({ t1: { inicio: '07:00', fim: '18:00' } });
    expect(drafts.forno).toEqual({ t1: { inicio: '07:00', fim: '18:00' } });
    expect(drafts.embalagem).toEqual({ t1: { inicio: '07:00', fim: '21:50' } });
    expect(drafts.fermentacao.t2).toBeUndefined();
    expect(drafts.fermentacao.t3).toBeUndefined();
  });

  it('inclui t2 e t3 só quando o snapshot tem esses números', () => {
    const drafts = manager.fromTurnos([
      t('fermentacao', 1, '07:00', '14:00'),
      t('fermentacao', 2, '14:00', '22:00'),
      t('fermentacao', 3, '22:00', '05:00'),
      t('forno', 1, '07:00', '18:00'),
      t('embalagem', 1, '07:00', '22:00'),
      t('embalagem', 2, '22:00', '05:00'),
    ]);

    expect(drafts.fermentacao).toEqual({
      t1: { inicio: '07:00', fim: '14:00' },
      t2: { inicio: '14:00', fim: '22:00' },
      t3: { inicio: '22:00', fim: '05:00' },
    });
    expect(drafts.embalagem.t2).toEqual({ inicio: '22:00', fim: '05:00' });
    expect(drafts.embalagem.t3).toBeUndefined();
  });

  it('descarta T3 órfão e preenche T1 ausente com o default da etapa', () => {
    const drafts = manager.fromTurnos([
      t('fermentacao', 3, '22:00', '05:00'),
      t('forno', 1, '08:00', '16:00'),
    ]);

    expect(drafts.fermentacao).toEqual({ t1: { inicio: '07:00', fim: '18:00' } });
    expect(drafts.forno.t1).toEqual({ inicio: '08:00', fim: '16:00' });
    expect(drafts.embalagem.t1).toEqual({ inicio: '07:00', fim: '21:50' });
  });
});

describe('OperacaoTurnoDraftManager.toTurnos', () => {
  it('serializa só os turnos presentes no draft, na ordem das etapas', () => {
    const turnos = manager.toTurnos({
      fermentacao: {
        t1: { inicio: '07:00', fim: '14:00' },
        t2: { inicio: '14:00', fim: '22:00' },
      },
      forno: { t1: { inicio: '07:00', fim: '18:00' } },
      embalagem: {
        t1: { inicio: '07:00', fim: '22:00' },
        t2: { inicio: '22:00', fim: '05:00' },
        t3: { inicio: '05:00', fim: '07:00' },
      },
    });

    expect(turnos).toEqual([
      t('fermentacao', 1, '07:00', '14:00'),
      t('fermentacao', 2, '14:00', '22:00'),
      t('forno', 1, '07:00', '18:00'),
      t('embalagem', 1, '07:00', '22:00'),
      t('embalagem', 2, '22:00', '05:00'),
      t('embalagem', 3, '05:00', '07:00'),
    ]);
  });
});

describe('OperacaoTurnoDraftManager.setTurnoEnabled', () => {
  it('liga o 2º turno com janela de 4h a partir do fim do 1º', () => {
    const next = manager.setTurnoEnabled(
      { t1: { inicio: '07:00', fim: '18:00' } },
      2,
      true,
    );

    expect(next.t2).toEqual({ inicio: '18:00', fim: '22:00' });
    expect(next.t3).toBeUndefined();
  });

  it('desliga o 2º turno e zera o 3º no draft', () => {
    const next = manager.setTurnoEnabled(
      {
        t1: { inicio: '07:00', fim: '14:00' },
        t2: { inicio: '14:00', fim: '22:00' },
        t3: { inicio: '22:00', fim: '05:00' },
      },
      2,
      false,
    );

    expect(next).toEqual({ t1: { inicio: '07:00', fim: '14:00' } });
  });

  it('só liga o 3º turno se o 2º estiver presente', () => {
    const semT2 = manager.setTurnoEnabled(
      { t1: { inicio: '07:00', fim: '18:00' } },
      3,
      true,
    );
    const comT2 = manager.setTurnoEnabled(
      {
        t1: { inicio: '07:00', fim: '18:00' },
        t2: { inicio: '18:00', fim: '22:00' },
      },
      3,
      true,
    );

    expect(semT2.t3).toBeUndefined();
    expect(comT2.t3).toEqual({ inicio: '22:00', fim: '02:00' });
  });
});

describe('OperacaoTurnoDraftManager.toPatch', () => {
  it('monta o body do PATCH só com turnos e tempos médios', () => {
    const snapshot = DEFAULT_CONFIG_OPERACAO;
    const draft = manager.fromSnapshot(snapshot);
    draft.tempoMedioFermentacaoMin = 200;
    draft.tempoMedioResfriamentoMin = 45;

    expect(manager.toPatch(draft)).toEqual({
      turnos: snapshot.turnos,
      tempoMedioFermentacaoMin: 200,
      tempoMedioResfriamentoMin: 45,
    });
  });
});
