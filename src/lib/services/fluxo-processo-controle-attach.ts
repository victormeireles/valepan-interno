import type {
  EstimativaProducaoHorarios,
  EstimativaProducaoRow,
} from '@/domain/estimativa-producao/estimativa-producao-types';
import { FluxoControleBuilder } from '@/domain/fluxo-processo/controle/fluxo-controle-builder';
import type {
  FluxoControleEventoInput,
  FluxoControleOpInput,
} from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type {
  FluxoApontamentoEvento,
  FluxoEtapaKey,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { buildCapacidadeContext } from '@/domain/fluxo-processo/fluxo-produtividade-capacidade';

export type FluxoControleAttachOrdem = {
  id: string;
  ordemPlanejamento: number;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  assadeiras: number;
  caixas: number;
  fermentacaoMetaConfirmada?: number | null;
  fornoMetaConfirmada?: number | null;
  embalagemMetaConfirmada?: number | null;
};

export type FluxoControleAttachInput = {
  dateISO: string;
  todayISO: string;
  asOfMs: number;
  ordens: FluxoControleAttachOrdem[];
  estimativas: EstimativaProducaoRow[];
  fermentacao: FluxoApontamentoEvento[];
  forno: FluxoApontamentoEvento[];
  embalagem: FluxoApontamentoEvento[];
};

/**
 * Anexa `fluxo.controle` a partir de estimativas + eventos já carregados.
 * Domínio permanece puro; `asOfMs` vem da borda (service).
 */
export class FluxoControleServiceAttach {
  constructor(private readonly builder = new FluxoControleBuilder()) {}

  attach(fluxo: VpFluxoPayload, input: FluxoControleAttachInput): void {
    const ops = this.buildOps(input.ordens, input.estimativas);
    const t1PorEtapa = t1PorEtapaFrom(fluxo);
    fluxo.controle = this.builder.build({
      dateISO: input.dateISO,
      todayISO: input.todayISO,
      asOfMs: input.asOfMs,
      ops,
      etapasVol: this.etapasVolRealizadoNoDia(fluxo),
      opAnteriorVol: fluxo.opAnterior.volOperacional,
      ordemAss: fluxo.ordemAss,
      eventos: {
        ferm: toEvento(input.fermentacao),
        forno: toEvento(input.forno),
        emb: toEvento(input.embalagem),
      },
      gapTotMin: this.etapasField(fluxo, 'gapTot'),
      ativoMin: this.etapasField(fluxo, 'ativo'),
      produtividade: fluxo.produtividade,
      capacidadeContext: buildCapacidadeContext(fluxo),
      ...(t1PorEtapa ? { t1PorEtapa } : {}),
    });
  }

  private buildOps(
    ordens: FluxoControleAttachOrdem[],
    estimativas: EstimativaProducaoRow[],
  ): FluxoControleOpInput[] {
    const byId = new Map(estimativas.map((e) => [e.ordemProducaoId, e]));
    return ordens.flatMap((o) => {
      const est = byId.get(o.id);
      if (!est) return [];
      return [
        {
          ...horariosFrom(est),
          id: o.id,
          ordemPlanejamento: o.ordemPlanejamento,
          produtoNome: o.produtoNome,
          assadeiraNome: o.assadeiraNome,
          unidades: o.unidades,
          assadeiras: o.assadeiras,
          caixas: o.caixas,
          fermentacaoMetaConfirmada: o.fermentacaoMetaConfirmada,
          fornoMetaConfirmada: o.fornoMetaConfirmada,
          embalagemMetaConfirmada: o.embalagemMetaConfirmada,
        },
      ];
    });
  }

  /**
   * `etapas.emb.volOperacional` já exclui OP anterior. O builder desconta
   * `opAnteriorVol` de `etapasVol.emb`, então aqui entra o total do dia.
   */
  private etapasVolRealizadoNoDia(
    fluxo: VpFluxoPayload,
  ): Record<FluxoEtapaKey, number> {
    const vols = this.etapasField(fluxo, 'volOperacional');
    return {
      ...vols,
      emb: vols.emb + fluxo.opAnterior.volOperacional,
    };
  }

  private etapasField(
    fluxo: VpFluxoPayload,
    field: 'un' | 'gapTot' | 'ativo' | 'volOperacional',
  ): Record<FluxoEtapaKey, number> {
    return {
      ferm: fluxo.etapas.find((e) => e.key === 'ferm')?.[field] ?? 0,
      forno: fluxo.etapas.find((e) => e.key === 'forno')?.[field] ?? 0,
      emb: fluxo.etapas.find((e) => e.key === 'emb')?.[field] ?? 0,
    };
  }
}

function t1PorEtapaFrom(
  fluxo: VpFluxoPayload,
): Record<FluxoEtapaKey, string> | undefined {
  const janelas = fluxo.janelasPorEtapa;
  if (!janelas) return undefined;
  return {
    ferm: janelas.ferm.t1Inicio,
    forno: janelas.forno.t1Inicio,
    emb: janelas.emb.t1Inicio,
  };
}

function horariosFrom(est: EstimativaProducaoRow): EstimativaProducaoHorarios {
  return {
    fermentacaoInicioPrevisto: est.fermentacaoInicioPrevisto,
    fermentacaoFimPrevisto: est.fermentacaoFimPrevisto,
    camaraFimPrevisto: est.camaraFimPrevisto,
    fornoInicioPrevisto: est.fornoInicioPrevisto,
    fornoFimPrevisto: est.fornoFimPrevisto,
    resfriamentoFimPrevisto: est.resfriamentoFimPrevisto,
    embalagemInicioPrevisto: est.embalagemInicioPrevisto,
    embalagemFimPrevisto: est.embalagemFimPrevisto,
  };
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
