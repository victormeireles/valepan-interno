import { FluxoFilasBuilder } from '@/domain/fluxo-processo/filas/fluxo-filas-builder';
import { FluxoFilasVisibilidade } from '@/domain/fluxo-processo/filas/fluxo-filas-visibilidade';
import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoFilasOpInput } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoEtapaKey, FluxoApontamentoEvento, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { FluxoUnidadesConverter } from '@/domain/fluxo-processo/fluxo-unidades-converter';

export type FluxoFilasAttachInput = {
  ops: FluxoFilasOpInput[];
  opsAnteriores?: FluxoFilasOpInput[];
  fermentacao: FluxoApontamentoEvento[];
  forno: FluxoApontamentoEvento[];
  embalagem: FluxoApontamentoEvento[];
  camaraMin: number;
  resfrioMin: number;
  asOfMs: number;
  opIdsVisiveis?: Set<string>;
  produtoNomesVisiveis?: Set<string>;
};

/**
 * Anexa `fluxo.filas` a partir das OPs do dia + eventos já carregados.
 * Converte latas/caixas → unidades (mesmo fator dos cards de etapa).
 */
export class FluxoFilasServiceAttach {
  constructor(
    private readonly builder = new FluxoFilasBuilder(),
    private readonly visibilidade = new FluxoFilasVisibilidade(),
  ) {}

  attach(fluxo: VpFluxoPayload, input: FluxoFilasAttachInput): void {
    const recorte = this.recorteVisivel(input);
    fluxo.filas = this.builder.build({
      ops: recorte.ops,
      opsAnteriores: recorte.opsAnteriores,
      eventosFerm: recorte.eventosFerm,
      eventosForno: recorte.eventosForno,
      eventosEmb: recorte.eventosEmb,
      camaraMin: input.camaraMin,
      resfrioMin: input.resfrioMin,
      asOfMs: input.asOfMs,
    });
  }

  private recorteVisivel(input: FluxoFilasAttachInput) {
    const opsAnteriores = input.opsAnteriores ?? [];
    const resolver = new FluxoFilasEventoResolver([...input.ops, ...opsAnteriores]);
    const bruto = {
      ops: input.ops,
      opsAnteriores,
      eventosFerm: resolver.resolve(input.fermentacao, 'ferm'),
      eventosForno: resolver.resolve(input.forno, 'forno'),
      eventosEmb: resolver.resolve(input.embalagem, 'emb'),
    };
    if (!input.opIdsVisiveis || !input.produtoNomesVisiveis) return bruto;
    return this.visibilidade.restringir({
      ...bruto,
      opIdsVisiveis: input.opIdsVisiveis,
      produtoNomesVisiveis: input.produtoNomesVisiveis,
    });
  }
}

class FluxoFilasEventoResolver {
  private readonly converter: FluxoUnidadesConverter;

  constructor(ops: FluxoFilasOpInput[]) {
    this.converter = new FluxoUnidadesConverter(
      ops.map((o) => ({
        produtoNome: o.produtoNome,
        assadeiraNome: o.assadeiraNome,
        unidades: o.unidades,
        latas: o.latas,
        caixas: o.caixas,
      })),
    );
  }

  resolve(rows: FluxoApontamentoEvento[], etapa: FluxoEtapaKey): FluxoControleEventoInput[] {
    return rows.map((r) => ({
      ordemProducaoId: r.ordemProducaoId,
      produtoNome: r.produtoNome,
      assadeiraNome: r.assadeiraNome,
      unidades: this.converter.resolveUnidades({
        unidades: r.unidades,
        latas: r.latas,
        caixas: r.caixas,
        produtoNome: r.produtoNome,
        assadeiraNome: r.assadeiraNome,
        etapa,
      }),
      produzidoEm: r.produzidoEm,
      dataOp: r.dataOp ?? '',
    }));
  }
}
