import type { InsumoMovimentoOrigem, InsumoMovimentoRecord } from '@/domain/types/insumo-estoque';
import {
  formatBrazilHourMinuteLabel,
  formatISODateBrNoYear,
  getBrazilDateISOFromInstant,
} from '@/lib/utils/date-utils';

export type InsumoHistoricoBlocoResumo = {
  loteCount: number;
  deltaQuantidade: number;
  saldoResultante: number;
  origemBadge: InsumoMovimentoOrigem | 'producao';
  inicio: Date;
  fim: Date;
};

export class InsumoHistoricoBlocoResumoBuilder {
  build(movimentos: readonly InsumoMovimentoRecord[]): InsumoHistoricoBlocoResumo {
    const datas = movimentos.map((mov) => new Date(mov.createdAt));
    const origens = new Set(movimentos.map((mov) => mov.origem));
    const origemUnica = origens.size === 1 ? movimentos[0].origem : 'producao';

    return {
      loteCount: movimentos.length,
      deltaQuantidade: movimentos.reduce((soma, mov) => soma + mov.deltaQuantidade, 0),
      saldoResultante: movimentos[0]?.saldoResultante ?? 0,
      origemBadge: origemUnica,
      inicio: new Date(Math.min(...datas.map((d) => d.getTime()))),
      fim: new Date(Math.max(...datas.map((d) => d.getTime()))),
    };
  }
}

function formatarPontoBloco(data: Date, incluirData: boolean): string {
  const hora = formatBrazilHourMinuteLabel(data);
  if (!incluirData) return hora;
  const dia = formatISODateBrNoYear(getBrazilDateISOFromInstant(data));
  return `${dia} ${hora}`;
}

export function formatarRotuloBlocoSaida(movimentos: readonly InsumoMovimentoRecord[]): string {
  const resumo = new InsumoHistoricoBlocoResumoBuilder().build(movimentos);
  const diasDistintos =
    getBrazilDateISOFromInstant(resumo.inicio) !== getBrazilDateISOFromInstant(resumo.fim);
  const inicio = formatarPontoBloco(resumo.inicio, diasDistintos);
  const fim = formatarPontoBloco(resumo.fim, diasDistintos);
  return `${resumo.loteCount} lotes entre ${inicio} e ${fim}`;
}
