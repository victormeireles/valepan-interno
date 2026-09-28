import { filterPedidosEmbalagemPorCategoriaVisivel } from '@/domain/categorias/filter-pedidos-embalagem-por-categoria';
import { pedidoUsaCaixasOuPacotes } from '@/domain/embalagem/painel-quantidade';
import {
  FluxoOpResultadoBuilder,
  type FluxoOpApontamento,
  type FluxoOpMeta,
  type FluxoOpResultado,
} from '@/domain/fluxo-processo/op-resultado/fluxo-op-resultado';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { AssadeiraMetaContext } from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import { resolveMetaEfetiva } from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import {
  fluxoLoteLeitura,
  type FluxoEmbLoteLeitura,
  type FluxoEtapaLoteLeitura,
} from '@/lib/services/fluxo-lote-leitura';
import { getBrazilCalendarDateTimeFromInstant } from '@/lib/utils/date-utils';

export type FluxoOpResultadoAttachInput = {
  dateISO: string;
  ordens: OrdemProducaoRecord[];
  visivelOrdemIds: Set<string>;
  categoriasVisiveis: Set<string>;
  categoriaPorProduto: Map<string, string | null>;
};

export type FluxoOpLotesCarregados = {
  emb: Map<string, FluxoEmbLoteLeitura[]>;
  ferm: Map<string, FluxoEtapaLoteLeitura[]>;
  forno: Map<string, FluxoEtapaLoteLeitura[]>;
};

/**
 * Anexa o resultado da OP (feito em todos os dias / meta da tela de realizado).
 * O gráfico por hora continua na janela; este número é o do cartão.
 */
export class FluxoOpResultadoAttach {
  constructor(private readonly builder = new FluxoOpResultadoBuilder()) {}

  loadLotes(ordemIds: string[]): Promise<FluxoOpLotesCarregados> {
    return Promise.all([
      fluxoLoteLeitura.listEmbByOrdemIds(ordemIds),
      fluxoLoteLeitura.listEtapaByOrdemIds('fermentacao_lotes', ordemIds),
      fluxoLoteLeitura.listEtapaByOrdemIds('forno_lotes', ordemIds),
    ]).then(([emb, ferm, forno]) => ({ emb, ferm, forno }));
  }

  attach(
    fluxo: VpFluxoPayload,
    input: FluxoOpResultadoAttachInput,
    lotes: FluxoOpLotesCarregados,
    assadeiraCtx: Map<string, AssadeiraMetaContext>,
  ): void {
    const embOrdens = this.ordensEmbalagem(input);
    const etapaOrdens = input.ordens.filter((ordem) => input.visivelOrdemIds.has(ordem.id));
    fluxo.opResultado = {
      ferm: this.resultadoEtapa(input.dateISO, 'fermentacao', etapaOrdens, lotes.ferm),
      forno: this.resultadoEtapa(input.dateISO, 'forno', etapaOrdens, lotes.forno),
      emb: this.resultadoEmbalagem(input.dateISO, embOrdens, lotes.emb, assadeiraCtx),
    };
  }

  private ordensEmbalagem(input: FluxoOpResultadoAttachInput): OrdemProducaoRecord[] {
    return filterPedidosEmbalagemPorCategoriaVisivel(
      input.ordens,
      input.categoriaPorProduto,
      input.categoriasVisiveis,
    ).filter((ordem) => pedidoUsaCaixasOuPacotes(ordem.quantidade));
  }

  private resultadoEmbalagem(
    dateISO: string,
    ordens: OrdemProducaoRecord[],
    lotes: Map<string, FluxoEmbLoteLeitura[]>,
    assadeiraCtx: Map<string, AssadeiraMetaContext>,
  ): FluxoOpResultado | null {
    const metas: FluxoOpMeta[] = ordens.map((ordem) => ({
      ordemId: ordem.id,
      meta: resolveMetaEfetiva('embalagem', ordem, assadeiraCtx.get(ordem.produtoId)),
    }));
    const apontamentos = ordens.flatMap((ordem) =>
      (lotes.get(ordem.id) ?? []).map((lote) =>
        apontamento(ordem.id, lote.produzidoEm, lote.quantidade.caixas),
      ),
    );
    return this.builder.build({ dateISO, unitLabel: 'CX', metas, apontamentos });
  }

  private resultadoEtapa(
    dateISO: string,
    etapa: Extract<EtapaProducaoSlug, 'fermentacao' | 'forno'>,
    ordens: OrdemProducaoRecord[],
    lotes: Map<string, FluxoEtapaLoteLeitura[]>,
  ): FluxoOpResultado | null {
    const metas: FluxoOpMeta[] = ordens.map((ordem) => ({
      ordemId: ordem.id,
      meta: resolveMetaEfetiva(etapa, ordem),
    }));
    const apontamentos = ordens.flatMap((ordem) =>
      (lotes.get(ordem.id) ?? []).map((lote) =>
        apontamento(ordem.id, lote.produzidoEm, quantidadeEtapa(ordem, lote)),
      ),
    );
    return this.builder.build({
      dateISO,
      unitLabel: unitLabelEtapa(ordens),
      metas,
      apontamentos,
    });
  }
}

function apontamento(ordemId: string, produzidoEm: string, quantidade: number): FluxoOpApontamento {
  const dia = diaCivil(produzidoEm);
  return { ordemId, dia, quantidade: dia ? quantidade : 0 };
}

function diaCivil(produzidoEm: string): string {
  const parsed = new Date(produzidoEm);
  if (Number.isNaN(parsed.getTime())) return '';
  return getBrazilCalendarDateTimeFromInstant(parsed).dateISO;
}

function quantidadeEtapa(ordem: OrdemProducaoRecord, lote: FluxoEtapaLoteLeitura): number {
  return resolveModoQuantidadeEtapa(ordem.assadeiraId) === 'assadeiras'
    ? lote.assadeiras
    : lote.unidades;
}

function unitLabelEtapa(ordens: OrdemProducaoRecord[]): string {
  const algumaAssadeira = ordens.some((ordem) => ordem.assadeiraId);
  return algumaAssadeira ? 'LT' : 'un';
}
