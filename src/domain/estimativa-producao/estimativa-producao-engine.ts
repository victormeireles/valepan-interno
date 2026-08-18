import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import type {
  EstimativaProducaoInput,
  EstimativaProducaoOrdemInput,
  EstimativaProducaoParams,
  EstimativaProducaoRow,
} from './estimativa-producao-types';

const MS_PER_HOUR = 3_600_000;
const MS_PER_MIN = 60_000;

type LineState = {
  fermFree: number;
  fornoFree: number;
  embFree: number;
};

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

function durationMs(quantity: number, ratePerHour: number): number {
  if (quantity <= 0 || ratePerHour <= 0) return 0;
  return (quantity / ratePerHour) * MS_PER_HOUR;
}

export class EstimativaProducaoEngine {
  build(input: EstimativaProducaoInput): EstimativaProducaoRow[] {
    const { params } = input;
    const state: LineState = {
      fermFree: brazilClockUtcMs(params.dataProducao, params.horarioInicioProducao),
      fornoFree: brazilClockUtcMs(params.dataProducao, params.horarioInicioForno),
      embFree: brazilClockUtcMs(params.dataProducao, params.horarioInicioEmbalagem),
    };

    const sorted = [...input.ordens].sort(
      (a, b) => a.ordemPlanejamento - b.ordemPlanejamento,
    );

    return sorted.map((ordem) => this.buildOrdem(ordem, params, state));
  }

  private buildOrdem(
    ordem: EstimativaProducaoOrdemInput,
    params: EstimativaProducaoParams,
    state: LineState,
  ): EstimativaProducaoRow {
    const fermIni = state.fermFree;
    const fermFim =
      fermIni + durationMs(ordem.assadeiras, params.taxaAssadeirasHoraProducao);
    state.fermFree = fermFim;

    const camaraPrimeira =
      fermIni + params.tempoMedioFermentacaoMin * MS_PER_MIN;
    const camaraFim = fermFim + params.tempoMedioFermentacaoMin * MS_PER_MIN;

    const fornoIni = Math.max(state.fornoFree, camaraPrimeira);
    const fornoFim =
      fornoIni + durationMs(ordem.assadeiras, params.taxaAssadeirasHoraForno);
    state.fornoFree = fornoFim;

    const resfriamentoPrimeira =
      fornoIni + params.tempoMedioResfriamentoMin * MS_PER_MIN;
    const resfriamentoFim = fornoFim + params.tempoMedioResfriamentoMin * MS_PER_MIN;

    const embIni = Math.max(state.embFree, resfriamentoPrimeira);
    const embFim = embIni + durationMs(ordem.caixas, params.taxaCaixasHoraEmbalagem);
    state.embFree = embFim;

    return {
      ordemProducaoId: ordem.id,
      fermentacaoInicioPrevisto: toIso(fermIni),
      fermentacaoFimPrevisto: toIso(fermFim),
      camaraFimPrevisto: toIso(camaraFim),
      fornoInicioPrevisto: toIso(fornoIni),
      fornoFimPrevisto: toIso(fornoFim),
      resfriamentoFimPrevisto: toIso(resfriamentoFim),
      embalagemInicioPrevisto: toIso(embIni),
      embalagemFimPrevisto: toIso(embFim),
    };
  }
}

export const estimativaProducaoEngine = new EstimativaProducaoEngine();
