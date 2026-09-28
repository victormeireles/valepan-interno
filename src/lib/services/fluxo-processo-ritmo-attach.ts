import {
  fluxoEtapaRitmoBuilder,
  fluxoEtapaRitmoEntriesMapper,
  type FluxoRitmoEntriesPorEtapa,
} from '@/domain/fluxo-processo/fluxo-etapa-ritmo';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoLotesDia } from '@/lib/services/fluxo-lote-leitura';

export type FluxoRitmoLotesDia = FluxoLotesDia;

export type FluxoProcessoRitmoAttachInput = {
  dateOntem: string | null;
  referenceEndMs: number | null;
  hoje: FluxoRitmoLotesDia;
  ontem: FluxoRitmoLotesDia;
  semana: FluxoRitmoLotesDia;
};

export class FluxoProcessoRitmoAttach {
  attach(fluxo: VpFluxoPayload, input: FluxoProcessoRitmoAttachInput): void {
    fluxo.ritmoPorEtapa = fluxoEtapaRitmoBuilder.build({
      dateOntem: input.dateOntem,
      referenceEndMs: input.referenceEndMs,
      hoje: toEntries(input.hoje),
      ontem: toEntries(input.ontem),
      semana: toEntries(input.semana),
    });
  }
}

function toEntries(dia: FluxoRitmoLotesDia): FluxoRitmoEntriesPorEtapa {
  return {
    ferm: fluxoEtapaRitmoEntriesMapper.fromFermFornoLotes(dia.ferm),
    forno: fluxoEtapaRitmoEntriesMapper.fromFermFornoLotes(dia.forno),
    emb: fluxoEtapaRitmoEntriesMapper.fromEmbLotes(dia.emb),
  };
}

export const fluxoProcessoRitmoAttach = new FluxoProcessoRitmoAttach();
