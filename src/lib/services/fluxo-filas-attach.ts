import { FluxoFilasBuilder } from '@/domain/fluxo-processo/filas/fluxo-filas-builder';
import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoFilasOpInput } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoApontamentoEvento, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

export type FluxoFilasAttachInput = {
  ops: FluxoFilasOpInput[];
  fermentacao: FluxoApontamentoEvento[];
  forno: FluxoApontamentoEvento[];
  embalagem: FluxoApontamentoEvento[];
  camaraMin: number;
  resfrioMin: number;
  asOfMs: number;
};

/**
 * Anexa `fluxo.filas` a partir das OPs do dia + eventos já carregados.
 * Domínio permanece puro; `asOfMs` vem da borda (service).
 */
export class FluxoFilasServiceAttach {
  constructor(private readonly builder = new FluxoFilasBuilder()) {}

  attach(fluxo: VpFluxoPayload, input: FluxoFilasAttachInput): void {
    fluxo.filas = this.builder.build({
      ops: input.ops,
      eventosFerm: toEvento(input.fermentacao),
      eventosForno: toEvento(input.forno),
      eventosEmb: toEvento(input.embalagem),
      camaraMin: input.camaraMin,
      resfrioMin: input.resfrioMin,
      asOfMs: input.asOfMs,
    });
  }
}

function toEvento(rows: FluxoApontamentoEvento[]): FluxoControleEventoInput[] {
  return rows.map((r) => ({
    ordemProducaoId: r.ordemProducaoId,
    produtoNome: r.produtoNome,
    assadeiraNome: r.assadeiraNome,
    unidades: r.unidades,
    produzidoEm: r.produzidoEm,
    dataOp: r.dataOp ?? '',
  }));
}
