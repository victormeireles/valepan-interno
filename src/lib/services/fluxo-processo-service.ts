import { categoriaVisibilidadeManager } from '@/domain/categorias/categoria-visibilidade-manager';
import {
  buildCategoriaPorProdutoMap,
  filterPedidosEmbalagemPorCategoriaVisivel,
} from '@/domain/categorias/filter-pedidos-embalagem-por-categoria';
import {
  RecorteVisivelEmbalagem,
  produtoNomesVisiveisDe,
} from '@/domain/categorias/recorte-visivel-embalagem';
import { assadeiraCor } from '@/domain/assadeiras/assadeira-cor';
import { FluxoProcessoBuilder } from '@/domain/fluxo-processo/fluxo-processo-builder';
import { FLUXO_ASSADEIRA_SEM, FLUXO_PADRAO } from '@/domain/fluxo-processo/fluxo-processo-constants';
import type {
  CargaFluxoProcessoResponse,
  FluxoApontamentoEvento,
  FluxoBuilderInput,
  FluxoOrdemFatorInput,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { FluxoEventosJanelaFilter } from '@/domain/fluxo-processo/fluxo-eventos-janela-filter';
import type { FluxoFilasOpInput } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { configOperacaoService } from '@/lib/services/config-operacao-service';
import { estimativaProducaoService } from '@/lib/services/estimativa-producao-service';
import { FluxoFilasServiceAttach } from '@/lib/services/fluxo-filas-attach';
import { FluxoOpResultadoAttach } from '@/lib/services/fluxo-op-resultado-attach';
import { fluxoAssadeiraMetaLoader } from '@/lib/services/fluxo-assadeira-meta-loader';
import { fluxoLoteLeitura } from '@/lib/services/fluxo-lote-leitura';
import {
  FluxoControleServiceAttach,
  type FluxoControleAttachOrdem,
} from '@/lib/services/fluxo-processo-controle-attach';
import {
  FluxoProcessoRitmoAttach,
} from '@/lib/services/fluxo-processo-ritmo-attach';
import { FluxoJanelaLotesLoader } from '@/lib/services/fluxo-janela-lotes-loader';
import { FluxoProcessoTvAttach } from '@/lib/services/fluxo-processo-tv-attach';
import { resolveReferenceEndMs } from '@/domain/painel-producao/painel-producao-areas';
import {
  addCalendarDaysISO,
  brazilDayEndUtcMs,
  getBrazilHourMinuteNow,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type AssadeiraRow = { id: string; nome: string; cor_hex: string | null };

/**
 * Carrega apontamentos na união das janelas T1 e monta o payload VP_FLUXO.
 */
export class FluxoProcessoService {
  private readonly builder = new FluxoProcessoBuilder();
  private readonly controleAttach = new FluxoControleServiceAttach();
  private readonly filasAttach = new FluxoFilasServiceAttach();
  private readonly ritmoAttach = new FluxoProcessoRitmoAttach();
  private readonly opResultadoAttach = new FluxoOpResultadoAttach();
  private readonly tvAttach = new FluxoProcessoTvAttach();
  private readonly janelaFilter = new FluxoEventosJanelaFilter();

  constructor(private readonly productService = new SupabaseProductService()) {}

  async getCargaCompleta(
    date: string,
    options?: { preferUltima?: boolean },
  ): Promise<CargaFluxoProcessoResponse> {
    const ultimaPromise = ordemProducaoRepository.findUltimaDataComPedidos(14);
    const ultimaInicial = options?.preferUltima ? await ultimaPromise : null;
    return this.loadForDate(ultimaInicial ?? date, ultimaPromise);
  }

  private async loadForDate(
    date: string,
    ultimaPromise: Promise<string | null>,
  ): Promise<CargaFluxoProcessoResponse> {
    const dateSemana = addCalendarDaysISO(date, -7);

    const [ultimaDataComDados, dateAnterior, ordensDia, config, categoriasVisiveis, produtividade] =
      await Promise.all([
        ultimaPromise,
        ordemProducaoRepository.findDataAnteriorComPedidos(date, 14),
        ordemProducaoRepository.listByDataProducao(date),
        configOperacaoService.getConfig(),
        categoriaVisibilidadeManager.getIdsVisiveisEmbalagem(),
        estimativaProducaoService.resolveProdutividadeForDate(date),
      ]);

    const janelaLotes = new FluxoJanelaLotesLoader();
    const janelasPorEtapa = janelaLotes.janelasPorEtapa(date, config);
    const { startIso, endIso } = janelaLotes.isoRangeUniao(janelasPorEtapa);
    const ordemIdsDia = ordensDia.map((ordem) => ordem.id);
    const [lotesHoje, lotesComparacao, opLotes, estimativas] = await Promise.all([
      fluxoLoteLeitura.loadRange(startIso, endIso),
      janelaLotes.loadComparacao(dateSemana, dateAnterior, config),
      this.opResultadoAttach.loadLotes(ordemIdsDia),
      estimativaProducaoService.listByOrdemIds(ordemIdsDia),
    ]);
    const { ferm: fermLotes, forno: fornoLotes, emb: embLotes } = lotesHoje;

    const conhecidas = new Set(ordemIdsDia);
    const ordemIds = collectOrdemIds(
      [...fermLotes, ...lotesComparacao.ontem.ferm, ...lotesComparacao.semana.ferm],
      [...fornoLotes, ...lotesComparacao.ontem.forno, ...lotesComparacao.semana.forno],
      [...embLotes, ...lotesComparacao.ontem.emb, ...lotesComparacao.semana.emb],
      ordensDia,
    ).filter((id) => !conhecidas.has(id));
    const ordensExtra = ordemIds.length > 0 ? await ordemProducaoRepository.findByIds(ordemIds) : [];
    const ordemById = new Map<string, OrdemProducaoRecord>();
    for (const ordem of [...ordensDia, ...ordensExtra]) ordemById.set(ordem.id, ordem);

    const produtoIds = [
      ...new Set([
        ...[...ordemById.values()].map((ordem) => ordem.produtoId),
        ...embLotes.map((lote) => lote.produtoId),
        ...lotesComparacao.ontem.emb.map((lote) => lote.produtoId),
        ...lotesComparacao.semana.emb.map((lote) => lote.produtoId),
      ]),
    ];
    const assadeiraIds = [
      ...new Set(
        [...ordemById.values()].map((ordem) => ordem.assadeiraId).filter((id): id is string => Boolean(id)),
      ),
    ];

    const [produtos, assadeiras] = await Promise.all([
      produtoIds.length > 0 ? this.productService.findByIds(produtoIds) : [],
      this.loadAssadeiraNames(assadeiraIds),
    ]);
    const assadeiraCtx = await fluxoAssadeiraMetaLoader.load(produtos);

    const produtoNomeById = new Map(produtos.map((produto) => [produto.id, produto.nome]));
    const assadeiraNomeById = new Map(assadeiras.map((assadeira) => [assadeira.id, assadeira.nome]));
    const categoriaPorProduto = buildCategoriaPorProdutoMap(produtos);
    const recorte = new RecorteVisivelEmbalagem(categoriaPorProduto, categoriasVisiveis);
    const visivelIds = recorte.ordemIdsVisiveis([...ordemById.values()]);
    const fermVisivel = recorte.lotesPorOrdem(fermLotes, visivelIds);
    const fornoVisivel = recorte.lotesPorOrdem(fornoLotes, visivelIds);
    const embVisivel = recorte.lotesPorProduto(embLotes);

    const resolveAssadeira = (ordem: OrdemProducaoRecord | undefined): string => {
      if (!ordem?.assadeiraId) return FLUXO_ASSADEIRA_SEM;
      return assadeiraNomeById.get(ordem.assadeiraId) ?? FLUXO_ASSADEIRA_SEM;
    };

    const resolveProduto = (
      produtoId: string | undefined,
      ordem: OrdemProducaoRecord | undefined,
    ): string => {
      if (produtoId && produtoNomeById.has(produtoId)) return produtoNomeById.get(produtoId)!;
      if (ordem && produtoNomeById.has(ordem.produtoId)) return produtoNomeById.get(ordem.produtoId)!;
      return 'Desconhecido';
    };

    const ordensFator: FluxoOrdemFatorInput[] = ordensDia.map((o) => ({
      produtoNome: resolveProduto(o.produtoId, o),
      assadeiraNome: resolveAssadeira(o),
      unidades: o.quantidade.unidades,
      latas: o.assadeiras,
      caixas: o.quantidade.caixas,
    }));

    const planoUn = ordensDia.reduce((t, o) => t + o.quantidade.unidades, 0);

    const fermentacao: FluxoApontamentoEvento[] = this.janelaFilter.filter(
      fermVisivel.map((l) => {
        const ordem = ordemById.get(l.ordemProducaoId);
        return {
          produzidoEm: l.produzidoEm,
          produtoNome: resolveProduto(ordem?.produtoId, ordem),
          assadeiraNome: resolveAssadeira(ordem),
          unidades: l.unidades,
          latas: l.assadeiras,
          dataOp: ordem?.dataProducao,
          ordemProducaoId: l.ordemProducaoId,
          turno: l.turno,
          loteId: l.id,
        };
      }),
      janelasPorEtapa.ferm,
    );

    const forno: FluxoApontamentoEvento[] = this.janelaFilter.filter(
      fornoVisivel.map((l) => {
        const ordem = ordemById.get(l.ordemProducaoId);
        return {
          produzidoEm: l.produzidoEm,
          produtoNome: resolveProduto(ordem?.produtoId, ordem),
          assadeiraNome: resolveAssadeira(ordem),
          unidades: l.unidades,
          latas: l.assadeiras,
          dataOp: ordem?.dataProducao,
          ordemProducaoId: l.ordemProducaoId,
          turno: l.turno,
          loteId: l.id,
        };
      }),
      janelasPorEtapa.forno,
    );

    const embalagem: FluxoApontamentoEvento[] = this.janelaFilter.filter(
      embVisivel.map((l) => {
        const ordemId = l.pedidoEmbalagemId ?? undefined;
        const ordem = ordemId ? ordemById.get(ordemId) : undefined;
        return {
          produzidoEm: l.produzidoEm,
          produtoNome: resolveProduto(l.produtoId, ordem),
          assadeiraNome: resolveAssadeira(ordem),
          unidades: l.quantidade.unidades,
          caixas: l.quantidade.caixas,
          dataOp: l.dataPedido || ordem?.dataProducao,
          ordemProducaoId: ordemId,
          turno: l.turno,
          loteId: l.id,
        };
      }),
      janelasPorEtapa.emb,
    );

    const input: FluxoBuilderInput = {
      dateISO: date,
      planoUn,
      ordensDia: ordensFator,
      fermentacao,
      forno,
      embalagem,
      padrao: {
        camaraMin: config.tempoMedioFermentacaoMin ?? FLUXO_PADRAO.camaraMin,
        resfrioMin: config.tempoMedioResfriamentoMin ?? FLUXO_PADRAO.resfrioMin,
      },
      coresByNome: assadeiraCor.indexByNome(assadeiras),
    };

    const fluxo = this.builder.build(input);
    fluxo.janelasPorEtapa = janelasPorEtapa;
    this.tvAttach.attach(fluxo, {
      dateISO: date,
      snapshot: config,
      fermentacao,
      forno,
      embalagem,
    });
    fluxo.produtividade = produtividade
      ? {
          taxaAssadeirasHoraProducao: produtividade.taxaAssadeirasHoraProducao,
          taxaAssadeirasHoraForno: produtividade.taxaAssadeirasHoraForno,
          taxaCaixasHoraEmbalagem: produtividade.taxaCaixasHoraEmbalagem,
        }
      : null;
    const ordensControle: FluxoControleAttachOrdem[] = ordensDia.map((o) => ({
      id: o.id,
      ordemPlanejamento: o.ordemPlanejamento,
      produtoNome: resolveProduto(o.produtoId, o),
      assadeiraNome: resolveAssadeira(o) || FLUXO_ASSADEIRA_SEM,
      unidades: o.quantidade.unidades,
      assadeiras: o.assadeiras,
      caixas: o.quantidade.caixas,
      fermentacaoMetaConfirmada: o.fermentacaoMetaConfirmada,
      fornoMetaConfirmada: o.fornoMetaConfirmada,
      embalagemMetaConfirmada: o.embalagemMetaConfirmada,
    }));
    this.controleAttach.attach(fluxo, {
      dateISO: date,
      todayISO: getTodayISOInBrazilTimezone(),
      asOfMs: Date.now(),
      ordens: ordensControle,
      estimativas,
      fermentacao,
      forno,
      embalagem,
    });
    const todayISO = getTodayISOInBrazilTimezone();
    const filasAsOfMs = date === todayISO ? Date.now() : brazilDayEndUtcMs(date);
    const ordensFilas = filterPedidosEmbalagemPorCategoriaVisivel(
      ordensDia,
      categoriaPorProduto,
      categoriasVisiveis,
    );
    const filasOps = ordensFilas.map((o) => toFluxoFilasOpInput(o, resolveProduto, resolveAssadeira));
    const nomesVisiveis = produtoNomesVisiveisDe(produtos, categoriasVisiveis);
    const idsDia = new Set(ordensFilas.map((o) => o.id));
    const filasOpsAnteriores = [...ordemById.values()]
      .filter((o) => o.dataProducao !== date && !idsDia.has(o.id))
      .filter((o) => nomesVisiveis.has(resolveProduto(o.produtoId, o)))
      .map((o) => toFluxoFilasOpInput(o, resolveProduto, resolveAssadeira));
    this.filasAttach.attach(fluxo, {
      ops: filasOps,
      opsAnteriores: filasOpsAnteriores,
      fermentacao,
      forno,
      embalagem,
      camaraMin: config.tempoMedioFermentacaoMin ?? FLUXO_PADRAO.camaraMin,
      resfrioMin: config.tempoMedioResfriamentoMin ?? FLUXO_PADRAO.resfrioMin,
      asOfMs: filasAsOfMs,
      opIdsVisiveis: idsDia,
      produtoNomesVisiveis: nomesVisiveis,
    });
    this.opResultadoAttach.attach(
      fluxo,
      {
        dateISO: date,
        ordens: ordensDia,
        visivelOrdemIds: visivelIds,
        categoriasVisiveis,
        categoriaPorProduto,
      },
      opLotes,
      assadeiraCtx,
    );
    this.ritmoAttach.attach(fluxo, {
      dateOntem: dateAnterior,
      referenceEndMs: ritmoReferenceEndMs(date),
      hoje: { ferm: fermVisivel, forno: fornoVisivel, emb: embVisivel },
      ontem: {
        ferm: recorte.lotesPorOrdem(lotesComparacao.ontem.ferm, visivelIds),
        forno: recorte.lotesPorOrdem(lotesComparacao.ontem.forno, visivelIds),
        emb: recorte.lotesPorProduto(lotesComparacao.ontem.emb),
      },
      semana: {
        ferm: recorte.lotesPorOrdem(lotesComparacao.semana.ferm, visivelIds),
        forno: recorte.lotesPorOrdem(lotesComparacao.semana.forno, visivelIds),
        emb: recorte.lotesPorProduto(lotesComparacao.semana.emb),
      },
    });

    return { date, ultimaDataComDados, fluxo };
  }

  private async loadAssadeiraNames(ids: string[]): Promise<AssadeiraRow[]> {
    if (ids.length === 0) return [];
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase.from('assadeiras').select('id, nome, cor_hex').in('id', ids);
    if (error) throw new Error(`Erro ao carregar assadeiras: ${error.message}`);
    return (data ?? []) as AssadeiraRow[];
  }
}

function toFluxoFilasOpInput(
  o: OrdemProducaoRecord,
  resolveProduto: (
    produtoId: string | undefined,
    ordem: OrdemProducaoRecord | undefined,
  ) => string,
  resolveAssadeira: (ordem: OrdemProducaoRecord | undefined) => string,
): FluxoFilasOpInput {
  return {
    id: o.id,
    ordemPlanejamento: o.ordemPlanejamento,
    produtoNome: resolveProduto(o.produtoId, o),
    assadeiraNome: resolveAssadeira(o) || FLUXO_ASSADEIRA_SEM,
    observacao: o.observacao ?? '',
    unidades: o.quantidade.unidades,
    latas: o.assadeiras,
    caixas: o.quantidade.caixas,
    dataProducao: o.dataProducao,
    fermentacaoFinalizada: o.fermentacaoFinalizada,
    fornoFinalizada: o.fornoFinalizada,
    embalagemFinalizada: o.embalagemFinalizada,
  };
}

function ritmoReferenceEndMs(dateISO: string): number | null {
  const hoje = getTodayISOInBrazilTimezone();
  if (dateISO !== hoje) return null;
  const { hour, minute } = getBrazilHourMinuteNow();
  return resolveReferenceEndMs(dateISO, hour * 60 + minute);
}

function collectOrdemIds(
  ferm: Array<{ ordemProducaoId: string }>,
  forno: Array<{ ordemProducaoId: string }>,
  emb: Array<{ pedidoEmbalagemId: string | null }>,
  ordensDia: OrdemProducaoRecord[],
): string[] {
  const ids = new Set<string>();
  for (const o of ordensDia) ids.add(o.id);
  for (const l of ferm) ids.add(l.ordemProducaoId);
  for (const l of forno) ids.add(l.ordemProducaoId);
  for (const l of emb) {
    if (l.pedidoEmbalagemId) ids.add(l.pedidoEmbalagemId);
  }
  return [...ids];
}

export const fluxoProcessoService = new FluxoProcessoService();
