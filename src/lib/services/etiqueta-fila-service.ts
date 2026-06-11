import { buildPainelPedido } from '@/domain/embalagem/painel-pedido-builder';
import { sortEtiquetaFilaItems } from '@/domain/etiquetas/etiqueta-fila-sorter';
import type { EtiquetaFilaItem, EtiquetaFilaResponse } from '@/domain/etiquetas/etiqueta-fila-types';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import {
  etiquetasGeradasRepository,
  type EtiquetasGeradasRepository,
} from '@/data/etiquetas/EtiquetasGeradasRepository';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import {
  tiposEstoqueService,
  type TiposEstoqueService,
} from '@/lib/services/tipos-estoque-service';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';

type EmbalagemLoteRepositoryPort = Pick<
  typeof embalagemLoteRepository,
  'listOrdemProducaoIdsByProduzidoDate' | 'listByPedidoEmbalagemIds'
>;

type PedidoEmbalagemRepositoryPort = Pick<typeof pedidoEmbalagemRepository, 'findByIds'>;

type ProductServicePort = Pick<SupabaseProductService, 'findByIds'>;

export type EtiquetaFilaServiceDeps = {
  embalagemLoteRepository: EmbalagemLoteRepositoryPort;
  pedidoEmbalagemRepository: PedidoEmbalagemRepositoryPort;
  etiquetasGeradasRepository: Pick<EtiquetasGeradasRepository, 'findByOrdemProducaoIds'>;
  tiposEstoqueService: Pick<TiposEstoqueService, 'findByIds'>;
  productService: ProductServicePort;
};

function isProduzidoOnDate(produzidoEm: string, dateIso: string): boolean {
  const start = `${dateIso}T00:00:00`;
  const end = `${dateIso}T23:59:59.999`;
  return produzidoEm >= start && produzidoEm <= end;
}

function computePrimeiroLoteHorario(
  lotes: EmbalagemLoteRecord[],
  dateIso: string,
): string | undefined {
  const earliest = lotes
    .filter((lote) => isProduzidoOnDate(lote.produzidoEm, dateIso))
    .map((lote) => lote.produzidoEm)
    .sort()[0];

  if (!earliest) return undefined;
  return formatLocalTimeHHmm(earliest) ?? undefined;
}

function mapPainelToFilaItem(
  pedido: PedidoEmbalagemRecord,
  painel: ReturnType<typeof buildPainelPedido>,
  tipoNome: string,
  dateIso: string,
  lotes: EmbalagemLoteRecord[],
  geradoEm?: string,
): EtiquetaFilaItem {
  const primeiroLoteHorario = computePrimeiroLoteHorario(lotes, dateIso);

  return {
    pedidoEmbalagemId: pedido.id,
    lote: painel.lote ?? null,
    pedidoCreatedAt: pedido.createdAt,
    produto: painel.produto,
    produtoId: pedido.produtoId,
    tipoEstoque: tipoNome,
    tipoEstoqueId: pedido.tipoEstoqueId,
    dataFabricacao: painel.dataFabricacao,
    pedido: painel.pedido,
    produzido: painel.produzido,
    unidade: painel.unidade,
    ...(geradoEm ? { geradoEm } : {}),
    ...(primeiroLoteHorario ? { primeiroLoteHorario } : {}),
  };
}

export class EtiquetaFilaService {
  constructor(private readonly deps: EtiquetaFilaServiceDeps = defaultDeps) {}

  private async buildNameMaps(pedidos: PedidoEmbalagemRecord[]) {
    const tipoIds = [...new Set(pedidos.map((pedido) => pedido.tipoEstoqueId))];
    const produtoIds = [...new Set(pedidos.map((pedido) => pedido.produtoId))];

    const [tipos, produtos] = await Promise.all([
      this.deps.tiposEstoqueService.findByIds(tipoIds),
      this.deps.productService.findByIds(produtoIds),
    ]);

    const tipoById = new Map(tipos.map((tipo) => [tipo.id, tipo]));
    const produtoNomeById = new Map(produtos.map((produto) => [produto.id, produto.nome]));

    return { tipoById, produtoNomeById };
  }

  async getFilaForDate(date: string): Promise<EtiquetaFilaResponse> {
    const ordemIds =
      await this.deps.embalagemLoteRepository.listOrdemProducaoIdsByProduzidoDate(date);

    if (ordemIds.length === 0) {
      return { date, pendentes: [], gerados: [] };
    }

    const pedidos = await this.deps.pedidoEmbalagemRepository.findByIds(ordemIds);
    if (pedidos.length === 0) {
      return { date, pendentes: [], gerados: [] };
    }

    const pedidoIds = pedidos.map((pedido) => pedido.id);
    const [lotesByPedido, { tipoById, produtoNomeById }, geradasMap] = await Promise.all([
      this.deps.embalagemLoteRepository.listByPedidoEmbalagemIds(pedidoIds),
      this.buildNameMaps(pedidos),
      this.deps.etiquetasGeradasRepository.findByOrdemProducaoIds(pedidoIds),
    ]);

    const pendentes: EtiquetaFilaItem[] = [];
    const gerados: EtiquetaFilaItem[] = [];

    for (const pedido of pedidos) {
      const tipo = tipoById.get(pedido.tipoEstoqueId);
      if (!tipo?.possuiEtiqueta) continue;

      const tipoNome = tipo.nome;
      const produtoNome = produtoNomeById.get(pedido.produtoId) ?? 'Desconhecido';
      const lotes = lotesByPedido.get(pedido.id) ?? [];
      const congeladoFromTipo: 'Sim' | 'Não' = tipo.congelado ? 'Sim' : 'Não';
      const painel = buildPainelPedido(
        pedido,
        tipoNome,
        produtoNome,
        lotes,
        true,
        congeladoFromTipo,
      );

      const gerada = geradasMap.get(pedido.id);
      const item = mapPainelToFilaItem(
        pedido,
        painel,
        tipoNome,
        date,
        lotes,
        gerada?.geradoEm,
      );

      if (gerada) {
        gerados.push(item);
      } else {
        pendentes.push(item);
      }
    }

    return {
      date,
      pendentes: sortEtiquetaFilaItems(pendentes),
      gerados: sortEtiquetaFilaItems(gerados),
    };
  }
}

const defaultDeps: EtiquetaFilaServiceDeps = {
  embalagemLoteRepository,
  pedidoEmbalagemRepository,
  etiquetasGeradasRepository,
  tiposEstoqueService,
  productService: new SupabaseProductService(),
};

export const etiquetaFilaService = new EtiquetaFilaService();
