import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import type { FluxoRitmoLotesDia } from '@/lib/services/fluxo-processo-ritmo-attach';
import { addCalendarDaysISO } from '@/lib/utils/date-utils';

const EMPTY_LOTES: FluxoRitmoLotesDia = { ferm: [], forno: [], emb: [] };

export function brazilCivilDayRangeIso(dateISO: string): { startIso: string; endIso: string } {
  return {
    startIso: `${dateISO}T00:00:00-03:00`,
    endIso: `${addCalendarDaysISO(dateISO, 1)}T00:00:00-03:00`,
  };
}

/**
 * Lotes apontados no dia civil BR (`produzidoEm`), inclusive OP do dia anterior.
 */
export class RitmoLotesDiaLoader {
  async load(dateISO: string): Promise<FluxoRitmoLotesDia> {
    const { startIso, endIso } = brazilCivilDayRangeIso(dateISO);
    return this.loadRange(startIso, endIso);
  }

  async loadRange(startIso: string, endIso: string): Promise<FluxoRitmoLotesDia> {
    const [ferm, forno, emb] = await Promise.all([
      fermentacaoLoteRepository.listByProduzidoEmRange(startIso, endIso),
      fornoLoteRepository.listByProduzidoEmRange(startIso, endIso),
      embalagemLoteRepository.listByProduzidoEmRange(startIso, endIso),
    ]);
    return { ferm, forno, emb };
  }

  async loadComparacao(
    dateSemana: string,
    dateOntem: string | null,
  ): Promise<{ ontem: FluxoRitmoLotesDia; semana: FluxoRitmoLotesDia }> {
    const loadOntem = Boolean(dateOntem && dateOntem !== dateSemana);
    const [semana, ontem] = await Promise.all([
      this.load(dateSemana),
      loadOntem && dateOntem ? this.load(dateOntem) : Promise.resolve(null),
    ]);
    return {
      semana,
      ontem: ontem ?? (dateOntem === dateSemana ? semana : EMPTY_LOTES),
    };
  }
}

export const ritmoLotesDiaLoader = new RitmoLotesDiaLoader();
