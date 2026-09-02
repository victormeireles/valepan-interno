import { configOperacaoMapper } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  JanelaOperacionalResolver,
  type JanelaOperacional,
} from '@/domain/producao-turno/janela-operacional';
import { Turno1Inicio } from '@/domain/producao-turno/turno-1-inicio';
import type { ProducaoTurnoEtapaId } from '@/domain/producao-turno/producao-turno-types';
import type { FluxoRitmoLotesDia } from '@/lib/services/fluxo-processo-ritmo-attach';
import { ritmoLotesDiaLoader } from '@/lib/services/ritmo-lotes-dia-loader';

const EMPTY_LOTES: FluxoRitmoLotesDia = { ferm: [], forno: [], emb: [] };

const ETAPA_TURNO: Record<FluxoEtapaKey, ProducaoTurnoEtapaId> = {
  ferm: 'fermentacao',
  forno: 'forno',
  emb: 'embalagem',
};

export type FluxoJanelasPorEtapa = Record<FluxoEtapaKey, JanelaOperacional>;

/**
 * União das janelas T1 (turno numero 1) e carga de lotes via `loadRange`.
 */
export class FluxoJanelaLotesLoader {
  constructor(
    private readonly resolver = new JanelaOperacionalResolver(),
    private readonly t1Inicio = new Turno1Inicio(),
  ) {}

  janelasPorEtapa(dateISO: string, config: ConfigOperacaoSnapshot): FluxoJanelasPorEtapa {
    return {
      ferm: this.janelaDaEtapa(dateISO, config, 'ferm'),
      forno: this.janelaDaEtapa(dateISO, config, 'forno'),
      emb: this.janelaDaEtapa(dateISO, config, 'emb'),
    };
  }

  private janelaDaEtapa(
    dateISO: string,
    config: ConfigOperacaoSnapshot,
    key: FluxoEtapaKey,
  ): JanelaOperacional {
    const turnos = configOperacaoMapper.turnosDaEtapa(config, ETAPA_TURNO[key]);
    return this.resolver.forDate(dateISO, this.t1Inicio.clock(turnos));
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
