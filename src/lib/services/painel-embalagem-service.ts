import { pedidosToDashboardSnapshots } from '@/domain/embalagem/painel-dashboard-adapter';
import { buildPainelPedido } from '@/domain/embalagem/painel-pedido-builder';
import {
  buildCategoriaPorProdutoMap,
  filterPedidosEmbalagemPorCategoriaVisivel,
} from '@/domain/categorias/filter-pedidos-embalagem-por-categoria';
import { categoriaVisibilidadeManager } from '@/domain/categorias/categoria-visibilidade-manager';
import {
  loadAssadeiraCtxByProdutoId,
  mapEtapasProduzidoPorOrdem,
  resolveEtapasLtForPedido,
} from '@/domain/embalagem/painel-embalagem-enrichment';
import { sortPorOrdemPlanejamento } from '@/domain/realizado/ordem-planejamento-sort';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type {
  CargaEmbalagemResponse,
  PainelEmbalagemResponse,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';
import type { AssadeiraMetaContext } from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import {
  tiposEstoqueService,
  type TipoEstoqueDTO,
} from '@/lib/services/tipos-estoque-service';
import { addCalendarDaysISO } from '@/lib/utils/date-utils';

export { buildPainelPedido, mapLoteToPainel } from '@/domain/embalagem/painel-pedido-builder';

export class PainelEmbalagemService {
  constructor(
    private readonly productService = new SupabaseProductService(),
  ) {}

  private async buildNameMaps(pedidos: PedidoEmbalagemRecord[]) {
    const tipoIds = [...new Set(pedidos.map((p) => p.tipoEstoqueId))];
    const produtoIds = [...new Set(pedidos.map((p) => p.produtoId))];

    const [tipos, produtos] = await Promise.all([
      tiposEstoqueService.findByIds(tipoIds),
      this.productService.findByIds(produtoIds),
    ]);

    const tipoById = new Map(tipos.map((t) => [t.id, t]));
    const produtoNomeById = new Map(produtos.map((p) => [p.id, p.nome]));
    const categoriaPorProduto = buildCategoriaPorProdutoMap(produtos);

    return { tipoById, produtoNomeById, categoriaPorProduto };
  }

  private filterPedidosPorCategoriaVisivel(
    pedidos: PedidoEmbalagemRecord[],
    categoriaPorProduto: Map<string, string | null>,
    categoriasVisiveis: Set<string>,
  ): PedidoEmbalagemRecord[] {
    return filterPedidosEmbalagemPorCategoriaVisivel(
      pedidos,
      categoriaPorProduto,
      categoriasVisiveis,
    );
  }

  private buildPedidosPainel(
    pedidos: PedidoEmbalagemRecord[],
    lotesByPedido: Map<string, EmbalagemLoteRecord[]>,
    tipoById: Map<string, TipoEstoqueDTO>,
    produtoNomeById: Map<string, string>,
    etapasByOrdem: Map<string, { fermentacao: number; forno: number }>,
    assadeiraByProduto: Map<string, AssadeiraMetaContext>,
  ): PainelPedidoEmbalagem[] {
    const result: PainelPedidoEmbalagem[] = [];

    for (const pedido of pedidos) {
      const tipo = tipoById.get(pedido.tipoEstoqueId);
      const cliente = tipo?.nome ?? 'Desconhecido';
      const produto = produtoNomeById.get(pedido.produtoId) ?? 'Desconhecido';
      const lotes = lotesByPedido.get(pedido.id) ?? [];
      const possuiEtiqueta = tipo?.possuiEtiqueta ?? false;
      const congeladoFromTipo = tipo?.congelado ? 'Sim' : 'Não';
      const etapasLt = resolveEtapasLtForPedido(pedido, etapasByOrdem);
      const assadeiraCtx = assadeiraByProduto.get(pedido.produtoId);

      result.push(
        buildPainelPedido(
          pedido,
          cliente,
          produto,
          lotes,
          possuiEtiqueta,
          congeladoFromTipo,
          assadeiraCtx,
          etapasLt,
        ),
      );
    }

    return sortPorOrdemPlanejamento(result);
  }

  private async loadPainelContext(pedidos: PedidoEmbalagemRecord[]) {
    const pedidoIds = pedidos.map((p) => p.id);
    const produtoIds = pedidos.map((p) => p.produtoId);

    const [lotesByPedido, fermentacaoLotes, fornoLotes, assadeiraByProduto, nameMaps, categoriasVisiveis] =
      await Promise.all([
        embalagemLoteRepository.listByPedidoEmbalagemIds(pedidoIds),
        fermentacaoLoteRepository.listByOrdemProducaoIds(pedidoIds),
        fornoLoteRepository.listByOrdemProducaoIds(pedidoIds),
        loadAssadeiraCtxByProdutoId(produtoIds),
        this.buildNameMaps(pedidos),
        categoriaVisibilidadeManager.getIdsVisiveisEmbalagem(),
      ]);

    const etapasByOrdem = mapEtapasProduzidoPorOrdem(
      pedidoIds,
      fermentacaoLotes as Map<string, FermentacaoLoteRecord[]>,
      fornoLotes as Map<string, FermentacaoLoteRecord[]>,
    );

    return { lotesByPedido, etapasByOrdem, assadeiraByProduto, categoriasVisiveis, ...nameMaps };
  }

  async getPainelForDate(date: string): Promise<PainelEmbalagemResponse> {
    const pedidos = await pedidoEmbalagemRepository.listByDataProducao(date);
    if (pedidos.length === 0) {
      return { date, pedidos: [] };
    }

    const ctx = await this.loadPainelContext(pedidos);
    const pedidosFiltrados = this.filterPedidosPorCategoriaVisivel(
      pedidos,
      ctx.categoriaPorProduto,
      ctx.categoriasVisiveis,
    );

    const result = this.buildPedidosPainel(
      pedidosFiltrados,
      ctx.lotesByPedido,
      ctx.tipoById,
      ctx.produtoNomeById,
      ctx.etapasByOrdem,
      ctx.assadeiraByProduto,
    );

    return { date, pedidos: result };
  }

  async getCargaCompleta(date: string): Promise<CargaEmbalagemResponse> {
    const dateSemana = addCalendarDaysISO(date, -7);

    const [ultimaDataComDados, dateAnterior] = await Promise.all([
      pedidoEmbalagemRepository.findUltimaDataComPedidos(7),
      pedidoEmbalagemRepository.findDataAnteriorComPedidos(date, 14),
    ]);

    const datesToLoad = [date, dateSemana, ...(dateAnterior ? [dateAnterior] : [])];
    const pedidosByDate = await pedidoEmbalagemRepository.listByDatasProducao(datesToLoad);

    const allPedidos = [...pedidosByDate.values()].flat();
    const ctx = await this.loadPainelContext(allPedidos);

    const pedidosMain = this.buildPedidosPainel(
      this.filterPedidosPorCategoriaVisivel(
        pedidosByDate.get(date) ?? [],
        ctx.categoriaPorProduto,
        ctx.categoriasVisiveis,
      ),
      ctx.lotesByPedido,
      ctx.tipoById,
      ctx.produtoNomeById,
      ctx.etapasByOrdem,
      ctx.assadeiraByProduto,
    );

    const pedidosSemana = this.buildPedidosPainel(
      this.filterPedidosPorCategoriaVisivel(
        pedidosByDate.get(dateSemana) ?? [],
        ctx.categoriaPorProduto,
        ctx.categoriasVisiveis,
      ),
      ctx.lotesByPedido,
      ctx.tipoById,
      ctx.produtoNomeById,
      ctx.etapasByOrdem,
      ctx.assadeiraByProduto,
    );

    const pedidosAnterior =
      dateAnterior != null
        ? this.buildPedidosPainel(
            this.filterPedidosPorCategoriaVisivel(
              pedidosByDate.get(dateAnterior) ?? [],
              ctx.categoriaPorProduto,
              ctx.categoriasVisiveis,
            ),
            ctx.lotesByPedido,
            ctx.tipoById,
            ctx.produtoNomeById,
            ctx.etapasByOrdem,
            ctx.assadeiraByProduto,
          )
        : [];

    return {
      date,
      ultimaDataComDados,
      pedidos: pedidosMain,
      comparacaoSemana: {
        date: dateSemana,
        items: pedidosToDashboardSnapshots(pedidosSemana),
      },
      comparacaoAnterior: {
        date: dateAnterior,
        items: pedidosToDashboardSnapshots(pedidosAnterior),
      },
    };
  }
}

export const painelEmbalagemService = new PainelEmbalagemService();
