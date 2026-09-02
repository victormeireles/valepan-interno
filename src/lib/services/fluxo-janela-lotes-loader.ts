import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  JanelaOperacionalResolver,
  type JanelaOperacional,
} from '@/domain/producao-turno/janela-operacional';
import type { FluxoRitmoLotesDia } from '@/lib/services/fluxo-processo-ritmo-attach';
import { ritmoLotesDiaLoader } from '@/lib/services/ritmo-lotes-dia-loader';

const EMPTY_LOTES: FluxoRitmoLotesDia = { ferm: [], forno: [], emb: [] };

export type FluxoJanelasPorEtapa = Record<FluxoEtapaKey, JanelaOperacional>;

/**
 * União das janelas T1 e carga de lotes via `loadRange` (não civil).
 */
export class FluxoJanelaLotesLoader {
  constructor(private readonly resolver = new JanelaOperacionalResolver()) {}

  janelasPorEtapa(dateISO: string, config: ConfigOperacaoSnapshot): FluxoJanelasPorEtapa {
    return {
      ferm: this.resolver.forDate(dateISO, config.horarioInicioProducao),
      forno: this.resolver.forDate(dateISO, config.horarioInicioForno),
      emb: this.resolver.forDate(dateISO, config.horarioInicioEmbalagem),
    };
  }

  isoRangeUniao(janelas: FluxoJanelasPorEtapa): { startIso: string; endIso: string } {
    return this.resolver.toIsoRange(
      this.resolver.union([janelas.ferm, janelas.forno, janelas.emb]),
    );
  }

  loadRangeForDate(
    dateISO: string,
    config: ConfigOperacaoSnapshot,
  ): Promise<FluxoRitmoLotesDia> {
    const { startIso, endIso } = this.isoRangeUniao(this.janelasPorEtapa(dateISO, config));
    return ritmoLotesDiaLoader.loadRange(startIso, endIso);
  }

  async loadComparacao(
    dateSemana: string,
    dateOntem: string | null,
    config: ConfigOperacaoSnapshot,
  ): Promise<{ ontem: FluxoRitmoLotesDia; semana: FluxoRitmoLotesDia }> {
    const loadOntem = Boolean(dateOntem && dateOntem !== dateSemana);
    const [semana, ontem] = await Promise.all([
      this.loadRangeForDate(dateSemana, config),
      loadOntem && dateOntem
        ? this.loadRangeForDate(dateOntem, config)
        : Promise.resolve(null),
    ]);
    return {
      semana,
      ontem: ontem ?? (dateOntem === dateSemana ? semana : EMPTY_LOTES),
    };
  }
}
