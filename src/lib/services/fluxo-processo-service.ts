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
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { FornoLoteRecord } from '@/domain/types/forno-lote';
import type { FluxoFilasOpInput } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { configOperacaoService } from '@/lib/services/config-operacao-service';
import { estimativaProducaoService } from '@/lib/services/estimativa-producao-service';
import { FluxoFilasServiceAttach } from '@/lib/services/fluxo-filas-attach';
import {
  FluxoControleServiceAttach,
  type FluxoControleAttachOrdem,
} from '@/lib/services/fluxo-processo-controle-attach';
import {
  FluxoProcessoRitmoAttach,
} from '@/lib/services/fluxo-processo-ritmo-attach';
import { ritmoLotesDiaLoader } from '@/lib/services/ritmo-lotes-dia-loader';
import { etapaPainelRecorteLoader } from '@/lib/services/etapa-painel-recorte-loader';
import { resolveReferenceEndMs } from '@/domain/painel-producao/painel-producao-areas';
import {
  addCalendarDaysISO,
  brazilDayEndUtcMs,
  getBrazilHourMinuteNow,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type AssadeiraRow = { id: string; nome: string; cor_hex: string | null };

/**
 * Carrega apontamentos do dia civil BR e monta o payload VP_FLUXO.
 */
export class FluxoProcessoService {
  private readonly builder = new FluxoProcessoBuilder();
  private readonly controleAttach = new FluxoControleServiceAttach();
  private readonly filasAttach = new FluxoFilasServiceAttach();
  private readonly ritmoAttach = new FluxoProcessoRitmoAttach();

  constructor(private readonly productService = new SupabaseProductService()) {}

  async getCargaCompleta(date: string): Promise<CargaFluxoProcessoResponse> {
    const dateSemana = addCalendarDaysISO(date, -7);

    const [ultimaDataComDados, dateAnterior, lotesHoje, ordensDia, config] =
      await Promise.all([
        ordemProducaoRepository.findUltimaDataComPedidos(14),
        ordemProducaoRepository.findDataAnteriorComPedidos(date, 14),
        ritmoLotesDiaLoader.load(date),
        ordemProducaoRepository.listByDataProducao(date),
        configOperacaoService.getConfig(),
      ]);
    const { ferm: fermLotes, forno: fornoLotes, emb: embLotes } = lotesHoje;

    const ordemIds = collectOrdemIds(fermLotes, fornoLotes, embLotes, ordensDia);
    const ordensExtra =
      ordemIds.length > 0 ? await ordemProducaoRepository.findByIds(ordemIds) : [];
    const ordemById = new Map<string, OrdemProducaoRecord>();
    for (const o of [...ordensDia, ...ordensExtra]) ordemById.set(o.id, o);

    const produtoIds = [
      ...new Set([
        ...[...ordemById.values()].map((o) => o.produtoId),
        ...embLotes.map((l) => l.produtoId),
      ]),
    ];
    const assadeiraIds = [
      ...new Set(
        [...ordemById.values()].map((o) => o.assadeiraId).filter((id): id is string => Boolean(id)),
      ),
    ];

    const [produtos, assadeiras, lotesComparacao, categoriasVisiveis] = await Promise.all([
      produtoIds.length > 0 ? this.productService.findByIds(produtoIds) : [],
      this.loadAssadeiraNames(assadeiraIds),
      ritmoLotesDiaLoader.loadComparacao(dateSemana, dateAnterior),
      categoriaVisibilidadeManager.getIdsVisiveisEmbalagem(),
    ]);

    const produtoNomeById = new Map(produtos.map((p) => [p.id, p.nome]));
    const assadeiraNomeById = new Map(assadeiras.map((a) => [a.id, a.nome]));
    const recorteResult = await etapaPainelRecorteLoader.resolve(
      [...ordemById.values()],
      [
        ...fermLotes,
        ...fornoLotes,
        ...lotesComparacao.ontem.ferm,
        ...lotesComparacao.ontem.forno,
        ...lotesComparacao.semana.ferm,
        ...lotesComparacao.semana.forno,
      ],
    );
    for (const extra of recorteResult.extraOrdens) {
      if (!ordemById.has(extra.id)) ordemById.set(extra.id, extra);
    }
    const recorte = new RecorteVisivelEmbalagem(
      buildCategoriaPorProdutoMap(produtos),
      categoriasVisiveis,
    );
    const visivelIds = recorteResult.visivelOrdemIds;
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

    const fermentacao: FluxoApontamentoEvento[] = fermVisivel.map((l) => {
      const ordem = ordemById.get(l.ordemProducaoId);
      return {
        produzidoEm: l.produzidoEm,
        produtoNome: resolveProduto(ordem?.produtoId, ordem),
        assadeiraNome: resolveAssadeira(ordem),
        unidades: l.unidades,
        latas: l.assadeiras,
        dataOp: ordem?.dataProducao,
        ordemProducaoId: l.ordemProducaoId,
      };
    });

    const forno: FluxoApontamentoEvento[] = fornoVisivel.map((l) => {
      const ordem = ordemById.get(l.ordemProducaoId);
      return {
        produzidoEm: l.produzidoEm,
        produtoNome: resolveProduto(ordem?.produtoId, ordem),
        assadeiraNome: resolveAssadeira(ordem),
        unidades: l.unidades,
        latas: l.assadeiras,
        dataOp: ordem?.dataProducao,
        ordemProducaoId: l.ordemProducaoId,
      };
    });

    const embalagem: FluxoApontamentoEvento[] = embVisivel.map((l) => {
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
      };
    });

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
    await this.syncEstimativa(date);
    const [estimativas, produtividade] = await Promise.all([
      estimativaProducaoService.listByOrdemIds(ordensDia.map((o) => o.id)),
      estimativaProducaoService.resolveProdutividadeForDate(date),
    ]);
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
      buildCategoriaPorProdutoMap(produtos),
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

  private async syncEstimativa(date: string): Promise<void> {
    try {
      await estimativaProducaoService.recalcForDate(date);
    } catch (error) {
      console.warn('[FluxoProcessoService] Falha ao recalcular estimativa', error);
    }
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
  ferm: FermentacaoLoteRecord[],
  forno: FornoLoteRecord[],
  emb: EmbalagemLoteRecord[],
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
