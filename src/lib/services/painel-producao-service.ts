import { loadAssadeiraCtxByProdutoId } from '@/domain/embalagem/painel-embalagem-enrichment';
import {
  buildCategoriaPorProdutoMap,
  filterPedidosEmbalagemPorCategoriaVisivel,
} from '@/domain/categorias/filter-pedidos-embalagem-por-categoria';
import { categoriaVisibilidadeManager } from '@/domain/categorias/categoria-visibilidade-manager';
import {
  buildAreasFromProducts,
  resolveReferenceEndMs,
} from '@/domain/painel-producao/painel-producao-areas';
import {
  buildPainelProducaoProduct,
  collectRitmoEntriesFromProducts,
} from '@/domain/painel-producao/painel-producao-builder';
import type {
  CargaPainelProducaoResponse,
  PainelProducaoData,
  PainelProducaoProduct,
} from '@/domain/painel-producao/painel-producao-types';
import {
  formatAgoraLabel,
  formatOpLabelFromDate,
} from '@/domain/painel-producao/painel-producao-time';
import { sortPorOrdemPlanejamento } from '@/domain/realizado/ordem-planejamento-sort';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';
import {
  addCalendarDaysISO,
  formatWeekdayDayMonthBr,
  getBrazilHourMinuteNow,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type AssadeiraRow = { id: string; nome: string };

export class PainelProducaoService {
  constructor(private readonly productService = new SupabaseProductService()) {}

  async getCargaCompleta(date: string): Promise<CargaPainelProducaoResponse> {
    const dateSemana = addCalendarDaysISO(date, -7);
    const [ultimaDataComDados, dateAnterior] = await Promise.all([
      ordemProducaoRepository.findUltimaDataComPedidos(7),
      ordemProducaoRepository.findDataAnteriorComPedidos(date, 14),
    ]);

    const datesToLoad = [date, dateSemana, ...(dateAnterior ? [dateAnterior] : [])];
    const ordensByDate = await ordemProducaoRepository.listByDatasProducao(datesToLoad);
    const allOrdens = [...ordensByDate.values()].flat();
    const ctx = await this.loadContext(allOrdens);

    const buildForDate = (targetDate: string) =>
      this.buildProductsForOrdens(
        this.filterOrdens(ordensByDate.get(targetDate) ?? [], ctx.categoriaPorProduto, ctx.categoriasVisiveis),
        ctx,
      );

    const productsMain = buildForDate(date);
    const productsSemana = buildForDate(dateSemana);
    const productsAnterior = dateAnterior ? buildForDate(dateAnterior) : [];

    const hoje = getTodayISOInBrazilTimezone();
    const { hour, minute } = date === hoje ? getBrazilHourMinuteNow() : { hour: 18, minute: 0 };
    const agoraMin = hour * 60 + minute;
    const referenceEndMs = resolveReferenceEndMs(date, agoraMin);

    const ritmoMain = this.collectRitmoMaps(productsMain, ctx.lotes);
    const ritmoSemana = this.collectRitmoMaps(productsSemana, ctx.lotes);
    const ritmoAnterior = this.collectRitmoMaps(productsAnterior, ctx.lotes);

    const areas = buildAreasFromProducts(
      productsMain,
      ritmoMain,
      ritmoAnterior,
      ritmoSemana,
      date,
      dateAnterior,
      dateSemana,
      referenceEndMs,
    );

    const painel: PainelProducaoData = {
      dia: date,
      diaLabel: formatWeekdayDayMonthBr(date),
      agora: formatAgoraLabel(hour, minute),
      op: formatOpLabelFromDate(date),
      areas,
      products: productsMain,
    };

    return { date, ultimaDataComDados, painel };
  }

  private collectRitmoMaps(
    products: PainelProducaoProduct[],
    lotes: PainelProducaoContext['lotes'],
  ) {
    return {
      ferm: collectRitmoEntriesFromProducts(products, 'ferm', lotes),
      forno: collectRitmoEntriesFromProducts(products, 'forno', lotes),
      emb: collectRitmoEntriesFromProducts(products, 'emb', lotes),
    };
  }

  private filterOrdens(
    ordens: OrdemProducaoRecord[],
    categoriaPorProduto: Map<string, string | null>,
    categoriasVisiveis: Set<string>,
  ): OrdemProducaoRecord[] {
    return filterPedidosEmbalagemPorCategoriaVisivel(
      ordens,
      categoriaPorProduto,
      categoriasVisiveis,
    );
  }

  private buildProductsForOrdens(
    ordens: OrdemProducaoRecord[],
    ctx: PainelProducaoContext,
  ): PainelProducaoProduct[] {
    const products = ordens.map((ordem) =>
      buildPainelProducaoProduct({
        ordem,
        produto: ctx.produtoNomeById.get(ordem.produtoId) ?? 'Desconhecido',
        cliente: ctx.tipoNomeById.get(ordem.tipoEstoqueId) ?? 'Desconhecido',
        congelado: ctx.congeladoByTipoId.get(ordem.tipoEstoqueId) ?? false,
        assadeiraNome: ordem.assadeiraId
          ? ctx.assadeiraNomeById.get(ordem.assadeiraId)
          : undefined,
        fermentacaoLotes: ctx.lotes.fermentacao.get(ordem.id) ?? [],
        fornoLotes: ctx.lotes.forno.get(ordem.id) ?? [],
        embalagemLotes: ctx.lotes.embalagem.get(ordem.id) ?? [],
        assadeiraCtx: ctx.assadeiraByProduto.get(ordem.produtoId),
      }),
    );

    return sortPorOrdemPlanejamento(products);
  }

  private async loadContext(ordens: OrdemProducaoRecord[]): Promise<PainelProducaoContext> {
    if (ordens.length === 0) {
      return {
        produtoNomeById: new Map(),
        tipoNomeById: new Map(),
        congeladoByTipoId: new Map(),
        assadeiraNomeById: new Map(),
        assadeiraByProduto: new Map(),
        categoriaPorProduto: new Map(),
        categoriasVisiveis: new Set(),
        lotes: { fermentacao: new Map(), forno: new Map(), embalagem: new Map() },
      };
    }

    const ordemIds = ordens.map((ordem) => ordem.id);
    const produtoIds = [...new Set(ordens.map((ordem) => ordem.produtoId))];
    const tipoIds = [...new Set(ordens.map((ordem) => ordem.tipoEstoqueId))];
    const assadeiraIds = [...new Set(ordens.map((ordem) => ordem.assadeiraId).filter(Boolean))];

    const [
      tipos,
      produtos,
      assadeiras,
      assadeiraByProduto,
      fermentacaoLotes,
      fornoLotes,
      embalagemLotes,
      categoriasVisiveis,
    ] = await Promise.all([
      tiposEstoqueService.findByIds(tipoIds),
      this.productService.findByIds(produtoIds),
      this.loadAssadeiraNames(assadeiraIds),
      loadAssadeiraCtxByProdutoId(produtoIds),
      fermentacaoLoteRepository.listByOrdemProducaoIds(ordemIds),
      fornoLoteRepository.listByOrdemProducaoIds(ordemIds),
      embalagemLoteRepository.listByPedidoEmbalagemIds(ordemIds),
      categoriaVisibilidadeManager.getIdsVisiveisEmbalagem(),
    ]);

    return {
      produtoNomeById: new Map(produtos.map((produto) => [produto.id, produto.nome])),
      tipoNomeById: new Map(tipos.map((tipo) => [tipo.id, tipo.nome])),
      congeladoByTipoId: new Map(tipos.map((tipo) => [tipo.id, Boolean(tipo.congelado)])),
      assadeiraNomeById: new Map(assadeiras.map((assadeira) => [assadeira.id, assadeira.nome])),
      assadeiraByProduto,
      categoriaPorProduto: buildCategoriaPorProdutoMap(produtos),
      categoriasVisiveis,
      lotes: {
        fermentacao: fermentacaoLotes as Map<string, FermentacaoLoteRecord[]>,
        forno: fornoLotes as Map<string, FermentacaoLoteRecord[]>,
        embalagem: embalagemLotes as Map<string, EmbalagemLoteRecord[]>,
      },
    };
  }

  private async loadAssadeiraNames(ids: string[]): Promise<AssadeiraRow[]> {
    if (ids.length === 0) return [];

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase.from('assadeiras').select('id, nome').in('id', ids);
    if (error) throw new Error(`Erro ao buscar assadeiras: ${error.message}`);
    return (data ?? []) as AssadeiraRow[];
  }
}

type PainelProducaoContext = {
  produtoNomeById: Map<string, string>;
  tipoNomeById: Map<string, string>;
  congeladoByTipoId: Map<string, boolean>;
  assadeiraNomeById: Map<string, string>;
  assadeiraByProduto: Awaited<ReturnType<typeof loadAssadeiraCtxByProdutoId>>;
  categoriaPorProduto: Map<string, string | null>;
  categoriasVisiveis: Set<string>;
  lotes: {
    fermentacao: Map<string, FermentacaoLoteRecord[]>;
    forno: Map<string, FermentacaoLoteRecord[]>;
    embalagem: Map<string, EmbalagemLoteRecord[]>;
  };
};

export const painelProducaoService = new PainelProducaoService();
