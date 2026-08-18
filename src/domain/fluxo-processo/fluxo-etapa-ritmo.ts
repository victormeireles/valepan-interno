import { buildRitmoComparisons } from '@/domain/painel-producao/painel-producao-ritmo';
import type { PainelProducaoRitmoEntry } from '@/domain/painel-producao/painel-producao-types';
import { derivarUnidadeEmbalagem } from '@/domain/embalagem/painel-quantidade';
import { FLUXO_FALLBACK_UN_POR_LATA } from './fluxo-processo-constants';
import type { FluxoApontamentoEvento, FluxoEtapaKey } from './fluxo-processo-types';

/** LT nativo do ritmo: assadeiras, ou UN ÷ fator quando o lote é só em unidades (Broa). */
class FluxoEtapaRitmoNativeLt {
  fromAssadeirasOuUnidades(assadeiras: number, unidades: number): number {
    if (assadeiras > 0) return assadeiras;
    if (unidades <= 0) return 0;
    return unidades / FLUXO_FALLBACK_UN_POR_LATA;
  }
}

const nativeLt = new FluxoEtapaRitmoNativeLt();

export type FluxoEtapaRitmo = {
  atual: number;
  ontem: number;
  semana: number;
};

export type FluxoRitmoPorEtapa = Record<FluxoEtapaKey, FluxoEtapaRitmo>;

export type FluxoRitmoEntriesPorEtapa = Record<FluxoEtapaKey, PainelProducaoRitmoEntry[]>;

export type FluxoEtapaRitmoBuildInput = {
  dateOntem: string | null;
  referenceEndMs: number | null;
  hoje: FluxoRitmoEntriesPorEtapa;
  ontem: FluxoRitmoEntriesPorEtapa;
  semana: FluxoRitmoEntriesPorEtapa;
};

const ETAPAS: FluxoEtapaKey[] = ['ferm', 'forno', 'emb'];

/**
 * Quantidade nativa do ritmo: LT em ferm/forno, CX (ou pct) em embalagem.
 */
export class FluxoEtapaRitmoEntriesMapper {
  fromEventos(
    etapa: FluxoEtapaKey,
    eventos: FluxoApontamentoEvento[],
  ): PainelProducaoRitmoEntry[] {
    const entries: PainelProducaoRitmoEntry[] = [];
    for (const evento of eventos) {
      const quantity = this.quantityFromEvento(etapa, evento);
      if (quantity <= 0) continue;
      entries.push({ quantity, timestamp: evento.produzidoEm });
    }
    return entries;
  }

  fromFermFornoLotes(
    lotes: Array<{ assadeiras: number; unidades: number; produzidoEm: string }>,
  ): PainelProducaoRitmoEntry[] {
    const entries: PainelProducaoRitmoEntry[] = [];
    for (const lote of lotes) {
      const quantity = nativeLt.fromAssadeirasOuUnidades(lote.assadeiras, lote.unidades);
      if (quantity <= 0) continue;
      entries.push({ quantity, timestamp: lote.produzidoEm });
    }
    return entries;
  }

  fromEmbLotes(
    lotes: Array<{
      quantidade: { caixas: number; pacotes: number };
      produzidoEm: string;
    }>,
  ): PainelProducaoRitmoEntry[] {
    const entries: PainelProducaoRitmoEntry[] = [];
    for (const lote of lotes) {
      const quantity = derivarUnidadeEmbalagem(lote.quantidade).valor;
      if (quantity <= 0) continue;
      entries.push({ quantity, timestamp: lote.produzidoEm });
    }
    return entries;
  }

  private quantityFromEvento(
    etapa: FluxoEtapaKey,
    evento: FluxoApontamentoEvento,
  ): number {
    if (etapa === 'emb') return evento.caixas ?? 0;
    return nativeLt.fromAssadeirasOuUnidades(evento.latas ?? 0, evento.unidades);
  }
}

/**
 * Ritmo médio por etapa: volume do dia civil ÷ tempo decorrido (primeiro lote → agora / último lote).
 */
export class FluxoEtapaRitmoBuilder {
  build(input: FluxoEtapaRitmoBuildInput): FluxoRitmoPorEtapa {
    const result = {} as FluxoRitmoPorEtapa;
    for (const etapa of ETAPAS) {
      result[etapa] = this.buildEtapa(input, etapa);
    }
    return result;
  }

  private buildEtapa(
    input: FluxoEtapaRitmoBuildInput,
    etapa: FluxoEtapaKey,
  ): FluxoEtapaRitmo {
    const comparacao = buildRitmoComparisons(
      input.hoje[etapa],
      input.ontem[etapa],
      input.semana[etapa],
      input.dateOntem,
      input.referenceEndMs,
    );
    return {
      atual: comparacao.ritmo,
      ontem: comparacao.ritmoOntem,
      semana: comparacao.ritmoSemana,
    };
  }
}

export const fluxoEtapaRitmoBuilder = new FluxoEtapaRitmoBuilder();
export const fluxoEtapaRitmoEntriesMapper = new FluxoEtapaRitmoEntriesMapper();
