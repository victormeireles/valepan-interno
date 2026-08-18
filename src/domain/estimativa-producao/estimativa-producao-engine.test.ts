import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { EstimativaProducaoEngine } from './estimativa-producao-engine';
import type { EstimativaProducaoParams } from './estimativa-producao-types';

const DATE = '2026-08-17';
const MS_PER_HOUR = 3_600_000;
const MS_PER_MIN = 60_000;

const params: EstimativaProducaoParams = {
  dataProducao: DATE,
  horarioInicioProducao: '00:00',
  horarioInicioForno: '04:00',
  horarioInicioEmbalagem: '07:00',
  tempoMedioFermentacaoMin: 180,
  tempoMedioResfriamentoMin: 60,
  taxaAssadeirasHoraProducao: 200,
  taxaAssadeirasHoraForno: 200,
  taxaCaixasHoraEmbalagem: 80,
};

function isoAt(clock: string, extraMs = 0): string {
  return new Date(brazilClockUtcMs(DATE, clock) + extraMs).toISOString();
}

const engine = new EstimativaProducaoEngine();

describe('EstimativaProducaoEngine', () => {
  it('espera o turno de forno quando a câmara termina antes', () => {
    const [row] = engine.build({
      params,
      ordens: [{ id: 'op-1', ordemPlanejamento: 1, assadeiras: 8, caixas: 4 }],
    });

    const fermDuration = (8 / 200) * MS_PER_HOUR;
    expect(row.fermentacaoInicioPrevisto).toBe(isoAt('00:00'));
    expect(row.fermentacaoFimPrevisto).toBe(isoAt('00:00', fermDuration));
    expect(row.camaraFimPrevisto).toBe(isoAt('00:00', fermDuration + 180 * MS_PER_MIN));
    expect(row.fornoInicioPrevisto).toBe(isoAt('04:00'));
    expect(row.fornoFimPrevisto).toBe(isoAt('04:00', fermDuration));
  });

  it('espera a câmara da primeira assadeira, não da última da OP', () => {
    const [row] = engine.build({
      params,
      ordens: [{ id: 'op-1', ordemPlanejamento: 1, assadeiras: 800, caixas: 80 }],
    });

    expect(row.fermentacaoFimPrevisto).toBe(isoAt('04:00'));
    expect(row.camaraFimPrevisto).toBe(isoAt('07:00'));
    expect(row.fornoInicioPrevisto).toBe(isoAt('04:00'));
    expect(row.fornoFimPrevisto).toBe(isoAt('08:00'));
  });

  it('forno da OP seguinte começa quando a linha libera, sem esperar a OP inteira na câmara', () => {
    const rows = engine.build({
      params,
      ordens: [
        { id: 'op-1', ordemPlanejamento: 1, assadeiras: 400, caixas: 200 },
        { id: 'op-2', ordemPlanejamento: 2, assadeiras: 400, caixas: 200 },
      ],
    });

    expect(rows[0].fornoInicioPrevisto).toBe(isoAt('04:00'));
    expect(rows[0].fornoFimPrevisto).toBe(isoAt('06:00'));
    expect(rows[1].fornoInicioPrevisto).toBe(isoAt('06:00'));
    expect(rows[1].fornoFimPrevisto).toBe(isoAt('08:00'));
  });

  it('espera o resfriamento e a OP anterior na embalagem', () => {
    const rows = engine.build({
      params,
      ordens: [
        { id: 'op-1', ordemPlanejamento: 1, assadeiras: 8, caixas: 80 },
        { id: 'op-2', ordemPlanejamento: 2, assadeiras: 8, caixas: 80 },
      ],
    });

    const fermDuration = (8 / 200) * MS_PER_HOUR;
    expect(rows[0].resfriamentoFimPrevisto).toBe(isoAt('04:00', fermDuration + 60 * MS_PER_MIN));
    expect(rows[0].embalagemInicioPrevisto).toBe(isoAt('07:00'));
    expect(rows[0].embalagemFimPrevisto).toBe(isoAt('08:00'));
    expect(rows[1].embalagemInicioPrevisto).toBe(isoAt('08:00'));
    expect(rows[1].embalagemFimPrevisto).toBe(isoAt('09:00'));
  });

  it('usa duração zero de fermentação e forno quando não há assadeiras', () => {
    const [row] = engine.build({
      params,
      ordens: [{ id: 'op-1', ordemPlanejamento: 1, assadeiras: 0, caixas: 80 }],
    });

    expect(row.fermentacaoInicioPrevisto).toBe(isoAt('00:00'));
    expect(row.fermentacaoFimPrevisto).toBe(isoAt('00:00'));
    expect(row.camaraFimPrevisto).toBe(isoAt('03:00'));
    expect(row.fornoInicioPrevisto).toBe(isoAt('04:00'));
    expect(row.fornoFimPrevisto).toBe(isoAt('04:00'));
    expect(row.embalagemInicioPrevisto).toBe(isoAt('07:00'));
    expect(row.embalagemFimPrevisto).toBe(isoAt('08:00'));
  });
});
