import { formatISODateBr, formatWeekdayDayMonthBr } from '@/lib/utils/date-utils';

import {
  FLUXO_ASSADEIRA_CORES,
  FLUXO_ASSADEIRA_ORDEM_BASE,
  FLUXO_ASSADEIRA_SEM,
  FLUXO_BLOCO_MAX_CX,
  FLUXO_BLOCO_MAX_LT_FERM,
  FLUXO_BLOCO_MAX_LT_FORNO,
  FLUXO_COR_ASSADEIRA_FALLBACK,
  FLUXO_ETAPA_NOME,
  FLUXO_PADRAO,
} from './fluxo-processo-constants';
import { FluxoLeadTimeCalculator } from './fluxo-lead-time';
import {
  FluxoMatrizHorariaBuilder,
  sumMatrizEtapa,
  type FluxoMatrizEntry,
} from './fluxo-matriz-horaria';
import { FluxoParadasCalculator } from './fluxo-paradas';
import {
  FluxoProdutosAssadeiraAggregator,
} from './fluxo-produtos-hora';
import { FluxoOndasAssadeiraCalculator } from './fluxo-ondas-assadeira';
import { FluxoQualidadeBlocoCalculator } from './fluxo-qualidade-bloco';
import type {
  FluxoApontamentoEvento,
  FluxoAssadeiraResumo,
  FluxoBuilderInput,
  FluxoEtapaKey,
  FluxoEtapaResumo,
  VpFluxoPayload,
} from './fluxo-processo-types';
import { FluxoUnidadesConverter } from './fluxo-unidades-converter';

type ResolvedEvent = {
  produzidoEm: string;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  /** LT (ferm/forno) ou CX (emb) do lançamento. */
  quantidadeOperacional: number;
  dataOp: string;
  opAnterior: boolean;
};

/**
 * Monta o payload VP_FLUXO a partir de apontamentos + OPs do dia.
 */
export class FluxoProcessoBuilder {
  private readonly paradas = new FluxoParadasCalculator();
  private readonly matrizBuilder = new FluxoMatrizHorariaBuilder();
  private readonly lead = new FluxoLeadTimeCalculator();
  private readonly produtosAgg = new FluxoProdutosAssadeiraAggregator();
  private readonly ondas = new FluxoOndasAssadeiraCalculator();

  build(input: FluxoBuilderInput): VpFluxoPayload {
    const converter = new FluxoUnidadesConverter(input.ordensDia);
    const ferm = this.resolve(input.fermentacao, converter, 'ferm', input.dateISO);
    const forno = this.resolve(input.forno, converter, 'forno', input.dateISO);
    const emb = this.resolve(input.embalagem, converter, 'emb', input.dateISO);

    const ordemAss = this.buildOrdemAss([ferm, forno, emb], input.ordensDia);
    const cores = this.buildCores(ordemAss);

    const byEtapa: Record<FluxoEtapaKey, FluxoMatrizEntry[]> = {
      ferm: ferm.map((e) => ({
        assadeiraNome: e.assadeiraNome,
        unidades: e.unidades,
        timestamp: e.produzidoEm,
      })),
      forno: forno.map((e) => ({
        assadeiraNome: e.assadeiraNome,
        unidades: e.unidades,
        timestamp: e.produzidoEm,
      })),
      emb: emb.map((e) => ({
        assadeiraNome: e.assadeiraNome,
        unidades: e.unidades,
        timestamp: e.produzidoEm,
        opAnterior: e.opAnterior,
      })),
    };

    const { matriz, matrizAnt } = this.matrizBuilder.build(ordemAss, byEtapa);

    const etapas: FluxoEtapaResumo[] = (['ferm', 'forno', 'emb'] as FluxoEtapaKey[]).map(
      (key) => {
        const events = key === 'ferm' ? ferm : key === 'forno' ? forno : emb;
        const timestamps = events.map((e) => e.produzidoEm);
        const parada = this.paradas.compute(timestamps);
        const un = sumMatrizEtapa(matriz, key);
        const maxQty =
          key === 'emb'
            ? FLUXO_BLOCO_MAX_CX
            : key === 'forno'
              ? FLUXO_BLOCO_MAX_LT_FORNO
              : FLUXO_BLOCO_MAX_LT_FERM;
        const qualidade = new FluxoQualidadeBlocoCalculator(maxQty).compute(
          events.map((e) => ({
            produzidoEm: e.produzidoEm,
            produtoNome: e.produtoNome,
            assadeiraNome: e.assadeiraNome,
            unidades: e.unidades,
            quantidadeOperacional: e.quantidadeOperacional,
          })),
        );
        return {
          key,
          nome: FLUXO_ETAPA_NOME[key],
          un,
          ini: parada?.ini ?? 0,
          fim: parada?.fim ?? 0,
          span: parada?.span ?? 0,
          gaps: parada?.gaps ?? [],
          gapTot: parada?.gapTot ?? 0,
          ativo: parada?.ativo ?? 0,
          eventos: events.length,
          blocoPct: qualidade.blocoPct,
          blocoLancamentos: qualidade.lancamentos,
        };
      },
    );

    const assadeiras = this.buildAssadeiras(ordemAss, ferm, forno, emb, converter);
    const embDia = emb.filter((e) => !e.opAnterior);
    const opAnteriorUn = emb.filter((e) => e.opAnterior).reduce((t, e) => t + e.unidades, 0);
    const opAnteriorEventos = emb.filter((e) => e.opAnterior).length;

    return {
      dia: formatISODateBr(input.dateISO),
      diaLabel: formatWeekdayDayMonthBr(input.dateISO),
      planoUn: Math.round(input.planoUn),
      etapas,
      padrao: { ...FLUXO_PADRAO },
      ordemAss,
      cores,
      matriz,
      matrizAnt,
      assadeiras,
      lead: {
        fermForno: this.lead.compute(
          ferm.map((e) => ({
            produtoNome: e.produtoNome,
            produzidoEm: e.produzidoEm,
            unidades: e.unidades,
          })),
          forno.map((e) => ({
            produtoNome: e.produtoNome,
            produzidoEm: e.produzidoEm,
            unidades: e.unidades,
          })),
        ),
        fornoEmb: this.lead.compute(
          forno.map((e) => ({
            produtoNome: e.produtoNome,
            produzidoEm: e.produzidoEm,
            unidades: e.unidades,
          })),
          embDia.map((e) => ({
            produtoNome: e.produtoNome,
            produzidoEm: e.produzidoEm,
            unidades: e.unidades,
          })),
        ),
      },
      opAnterior: { un: opAnteriorUn, eventos: opAnteriorEventos },
      trocas: { forno: countTrocasAssadeira(forno) },
      unPorCaixaByProduto: converter.knownUnPorCaixaByProduto(),
    };
  }

  private resolve(
    rows: FluxoApontamentoEvento[],
    converter: FluxoUnidadesConverter,
    etapa: FluxoEtapaKey,
    dateISO: string,
  ): ResolvedEvent[] {
    return rows
      .map((r) => {
        const ass = r.assadeiraNome?.trim() || FLUXO_ASSADEIRA_SEM;
        const unidades = converter.resolveUnidades({
          unidades: r.unidades,
          latas: r.latas,
          caixas: r.caixas,
          produtoNome: r.produtoNome,
          assadeiraNome: ass,
          etapa,
        });
        const quantidadeOperacional = resolveQuantidadeOperacional({
          etapa,
          unidades,
          latas: r.latas,
          caixas: r.caixas,
          produtoNome: r.produtoNome,
          assadeiraNome: ass,
          converter,
        });
        const opAnterior =
          etapa === 'emb' && r.dataOp != null && r.dataOp.trim() !== '' && r.dataOp < dateISO;
        return {
          produzidoEm: r.produzidoEm,
          produtoNome: r.produtoNome,
          assadeiraNome: ass,
          unidades,
          quantidadeOperacional,
          dataOp: (r.dataOp ?? '').trim(),
          opAnterior: Boolean(opAnterior),
        };
      })
      .filter((e) => e.unidades > 0)
      .sort((a, b) => new Date(a.produzidoEm).getTime() - new Date(b.produzidoEm).getTime());
  }

  private buildOrdemAss(
    groups: ResolvedEvent[][],
    ordens: FluxoBuilderInput['ordensDia'],
  ): string[] {
    const seen = new Set<string>();
    const extra: string[] = [];
    for (const nome of FLUXO_ASSADEIRA_ORDEM_BASE) seen.add(nome);

    const consider = (nome: string) => {
      const n = nome || FLUXO_ASSADEIRA_SEM;
      if (!seen.has(n)) {
        seen.add(n);
        extra.push(n);
      }
    };

    for (const op of ordens) consider(op.assadeiraNome || FLUXO_ASSADEIRA_SEM);
    for (const g of groups) {
      for (const e of g) consider(e.assadeiraNome);
    }

    const baseUsed = FLUXO_ASSADEIRA_ORDEM_BASE.filter((a) => {
      if (a === FLUXO_ASSADEIRA_SEM) return true;
      return (
        groups.some((g) => g.some((e) => e.assadeiraNome === a)) ||
        ordens.some((o) => (o.assadeiraNome || FLUXO_ASSADEIRA_SEM) === a)
      );
    });

    // Always keep N/A at end if present in base; include extras before N/A
    const withoutNa = baseUsed.filter((a) => a !== FLUXO_ASSADEIRA_SEM);
    const hasNa =
      baseUsed.includes(FLUXO_ASSADEIRA_SEM) ||
      groups.some((g) => g.some((e) => e.assadeiraNome === FLUXO_ASSADEIRA_SEM));
    return [...withoutNa, ...extra.filter((a) => a !== FLUXO_ASSADEIRA_SEM), ...(hasNa ? [FLUXO_ASSADEIRA_SEM] : [])];
  }

  private buildCores(ordemAss: string[]): Record<string, string> {
    const cores: Record<string, string> = {};
    for (const a of ordemAss) {
      cores[a] = FLUXO_ASSADEIRA_CORES[a] ?? FLUXO_COR_ASSADEIRA_FALLBACK;
    }
    return cores;
  }

  private buildAssadeiras(
    ordemAss: string[],
    ferm: ResolvedEvent[],
    forno: ResolvedEvent[],
    emb: ResolvedEvent[],
    converter: FluxoUnidadesConverter,
  ): FluxoAssadeiraResumo[] {
    return ordemAss.map((nome) => {
      const produtos = this.produtosAgg.collect(nome, ferm, forno, emb);
      const fermTot = sumByAss(ferm, nome);
      const fornoTot = sumByAss(forno, nome);
      const embTot = sumByAss(emb, nome);
      const embAnt = emb
        .filter((e) => e.assadeiraNome === nome && e.opAnterior)
        .reduce((t, e) => t + e.unidades, 0);
      const sampleProd = produtos[0]?.nome ?? '';
      const ondas = this.ondas.computeForAssadeira(nome, ferm, forno, emb);
      return {
        nome,
        ferm: fermTot,
        forno: fornoTot,
        emb: embTot,
        embAnt,
        unPorLata: Math.round(converter.unPorLata(sampleProd, nome)),
        produtos,
        ondas,
      };
    });
  }
}

function sumByAss(rows: ResolvedEvent[], ass: string): number {
  return rows.filter((e) => e.assadeiraNome === ass).reduce((t, e) => t + e.unidades, 0);
}

/** Quantidade operacional = unidades ÷ fator da assadeira/produto da OP. */
function resolveQuantidadeOperacional(input: {
  etapa: FluxoEtapaKey;
  unidades: number;
  latas?: number;
  caixas?: number;
  produtoNome: string;
  assadeiraNome: string;
  converter: FluxoUnidadesConverter;
}): number {
  if (input.unidades <= 0) return 0;
  if (input.etapa === 'emb') {
    const fator = input.converter.unPorCaixa(input.produtoNome, input.assadeiraNome);
    return fator > 0 ? input.unidades / fator : 0;
  }
  const fator = input.converter.unPorLata(input.produtoNome, input.assadeiraNome);
  return fator > 0 ? input.unidades / fator : 0;
}

/** Conta mudanças de assadeira entre apontamentos consecutivos do forno. */
function countTrocasAssadeira(forno: ResolvedEvent[]): number {
  let trocas = 0;
  for (let i = 1; i < forno.length; i++) {
    if (forno[i].assadeiraNome !== forno[i - 1].assadeiraNome) trocas += 1;
  }
  return trocas;
}

export function assertMatrizFechaComEtapas(payload: VpFluxoPayload): void {
  for (const e of payload.etapas) {
    const soma = sumMatrizEtapa(payload.matriz, e.key);
    if (soma !== e.un) {
      throw new Error(`Matriz ${e.key} soma ${soma} ≠ etapa.un ${e.un}`);
    }
  }
  const ant = sumMatrizEtapa(payload.matrizAnt, 'emb');
  if (ant !== payload.opAnterior.un) {
    throw new Error(`matrizAnt.emb soma ${ant} ≠ opAnterior.un ${payload.opAnterior.un}`);
  }
}
