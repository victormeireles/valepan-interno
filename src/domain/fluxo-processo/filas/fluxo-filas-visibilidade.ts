import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoFilasOpInput } from './fluxo-filas-types';

export type FluxoFilasVisibilidadeInput = {
  ops: FluxoFilasOpInput[];
  opsAnteriores: FluxoFilasOpInput[];
  eventosFerm: FluxoControleEventoInput[];
  eventosForno: FluxoControleEventoInput[];
  eventosEmb: FluxoControleEventoInput[];
  opIdsVisiveis: Set<string>;
  produtoNomesVisiveis: Set<string>;
};

export type FluxoFilasVisibilidadeResult = {
  ops: FluxoFilasOpInput[];
  opsAnteriores: FluxoFilasOpInput[];
  eventosFerm: FluxoControleEventoInput[];
  eventosForno: FluxoControleEventoInput[];
  eventosEmb: FluxoControleEventoInput[];
};

/**
 * Restringe filas WIP ao conjunto visível do dashboard (categorias
 * visíveis na embalagem — Hambúrguer e Hot Dog).
 * OPs extra (outro dia) filtram por nome de produto, não por ids do dia.
 */
export class FluxoFilasVisibilidade {
  restringir(input: FluxoFilasVisibilidadeInput): FluxoFilasVisibilidadeResult {
    const ops = input.ops.filter((op) => input.opIdsVisiveis.has(op.id));
    const opIds = new Set(ops.map((op) => op.id));
    return {
      ops,
      opsAnteriores: input.opsAnteriores.filter((op) =>
        input.produtoNomesVisiveis.has(op.produtoNome),
      ),
      eventosFerm: input.eventosFerm.filter((e) =>
        Boolean(e.ordemProducaoId && opIds.has(e.ordemProducaoId)),
      ),
      eventosForno: input.eventosForno.filter((e) =>
        Boolean(e.ordemProducaoId && opIds.has(e.ordemProducaoId)),
      ),
      eventosEmb: input.eventosEmb.filter((e) =>
        input.produtoNomesVisiveis.has(e.produtoNome),
      ),
    };
  }
}
