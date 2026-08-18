import { getTodayISOInBrazilTimezone, getBrazilHourMinuteNow } from '@/lib/utils/date-utils';
import {
  buildRitmoComparisons,
  formatRitmoJanelaLabels,
} from '@/domain/painel-producao/painel-producao-ritmo';
import { resolveReferenceEndMs } from '@/domain/painel-producao/painel-producao-areas';
import type { PainelProducaoRitmoEntry } from '@/domain/painel-producao/painel-producao-types';

export type RealizadoRitmoMediaInput = {
  hoje: PainelProducaoRitmoEntry[];
  ontem: PainelProducaoRitmoEntry[];
  semana: PainelProducaoRitmoEntry[];
  dateOntem: string | null;
  endCapMs: number | null;
};

export type RealizadoRitmoMediaView = {
  ritmo: number;
  ritmoOntem: number;
  ritmoSemana: number;
  horaInicioLabel: string;
  horaFimLabel: string;
};

export class RealizadoRitmoMediaBuilder {
  build(input: RealizadoRitmoMediaInput): RealizadoRitmoMediaView | null {
    const janela = formatRitmoJanelaLabels(input.hoje, input.endCapMs);
    if (!janela) return null;

    const comparacao = buildRitmoComparisons(
      input.hoje,
      input.ontem,
      input.semana,
      input.dateOntem,
      input.endCapMs,
    );

    return {
      ritmo: comparacao.ritmo,
      ritmoOntem: comparacao.ritmoOntem,
      ritmoSemana: comparacao.ritmoSemana,
      horaInicioLabel: janela.ini,
      horaFimLabel: janela.fim,
    };
  }
}

export const realizadoRitmoMediaBuilder = new RealizadoRitmoMediaBuilder();

export function ritmoEndCapMs(dateISO: string): number | null {
  const hoje = getTodayISOInBrazilTimezone();
  if (dateISO !== hoje) return null;
  const { hour, minute } = getBrazilHourMinuteNow();
  return resolveReferenceEndMs(dateISO, hour * 60 + minute);
}

export function entriesFromEmbalagemItems(
  items: Array<{ caixas?: number; producaoUpdatedAt?: string }>,
): PainelProducaoRitmoEntry[] {
  const entries: PainelProducaoRitmoEntry[] = [];
  for (const item of items) {
    const quantity = item.caixas ?? 0;
    const timestamp = item.producaoUpdatedAt;
    if (quantity <= 0 || !timestamp) continue;
    entries.push({ quantity, timestamp });
  }
  return entries;
}

export function entriesFromEtapaItems(
  items: Array<{ assadeiras: number; produzidoEm?: string }>,
): PainelProducaoRitmoEntry[] {
  const entries: PainelProducaoRitmoEntry[] = [];
  for (const item of items) {
    const timestamp = item.produzidoEm;
    if (item.assadeiras <= 0 || !timestamp) continue;
    entries.push({ quantity: item.assadeiras, timestamp });
  }
  return entries;
}
