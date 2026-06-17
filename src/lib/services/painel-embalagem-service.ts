import { pedidosToDashboardSnapshots } from '@/domain/embalagem/painel-dashboard-adapter';
import { buildPainelPedido } from '@/domain/embalagem/painel-pedido-builder';
import { sortPorOrdemPlanejamento } from '@/domain/realizado/ordem-planejamento-sort';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type {
  CargaEmbalagemResponse,
  PainelEmbalagemResponse,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
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

    return { tipoById, produtoNomeById };
  }

  private buildPedidosPainel(
    pedidos: PedidoEmbalagemRecord[],
    lotesByPedido: Map<string, EmbalagemLoteRecord[]>,
    tipoById: Map<string, TipoEstoqueDTO>,
    produtoNomeById: Map<string, string>,
  ): PainelPedidoEmbalagem[] {
    const result: PainelPedidoEmbalagem[] = [];

    for (const pedido of pedidos) {
      const tipo = tipoById.get(pedido.tipoEstoqueId);
      const cliente = tipo?.nome ?? 'Desconhecido';
      const produto = produtoNomeById.get(pedido.produtoId) ?? 'Desconhecido';
      const lotes = lotesByPedido.get(pedido.id) ?? [];
      const possuiEtiqueta = tipo?.possuiEtiqueta ?? false;
      const congeladoFromTipo = tipo?.congelado ? 'Sim' : 'Não';

      result.push(
        buildPainelPedido(pedido, cliente, produto, lotes, possuiEtiqueta, congeladoFromTipo),
      );
    }

    return sortPorOrdemPlanejamento(result);
  }

  async getPainelForDate(date: string): Promise<PainelEmbalagemResponse> {
    const pedidos = await pedidoEmbalagemRepository.listByDataProducao(date);
    if (pedidos.length === 0) {
      return { date, pedidos: [] };
    }

    const pedidoIds = pedidos.map((p) => p.id);
    const [lotesByPedido, { tipoById, produtoNomeById }] = await Promise.all([
      embalagemLoteRepository.listByPedidoEmbalagemIds(pedidoIds),
      this.buildNameMaps(pedidos),
    ]);

    const result = this.buildPedidosPainel(
      pedidos,
      lotesByPedido,
      tipoById,
      produtoNomeById,
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
    const pedidoIds = allPedidos.map((p) => p.id);

    const [lotesByPedido, { tipoById, produtoNomeById }] = await Promise.all([
      embalagemLoteRepository.listByPedidoEmbalagemIds(pedidoIds),
      this.buildNameMaps(allPedidos),
    ]);

    const pedidosMain = this.buildPedidosPainel(
      pedidosByDate.get(date) ?? [],
      lotesByPedido,
      tipoById,
      produtoNomeById,
    );

    const pedidosSemana = this.buildPedidosPainel(
      pedidosByDate.get(dateSemana) ?? [],
      lotesByPedido,
      tipoById,
      produtoNomeById,
    );

    const pedidosAnterior =
      dateAnterior != null
        ? this.buildPedidosPainel(
            pedidosByDate.get(dateAnterior) ?? [],
            lotesByPedido,
            tipoById,
            produtoNomeById,
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
