import { buildPainelPedido } from '@/domain/embalagem/painel-pedido-builder';
import { loteFromDataFabricacaoEtiqueta } from '@/domain/embalagem/lote-from-data-fabricacao';
import {
  findPrimeiroLoteCriadoDoDia,
  findPrimeiroLoteProduzidoDoDia,
} from '@/domain/etiquetas/etiqueta-primeiro-lote';
import { mapManualGeradaToFilaItem } from '@/domain/etiquetas/etiqueta-fila-manual-mapper';
import {
  sortEtiquetaFilaItems,
  sortEtiquetaGeradosFilaItems,
} from '@/domain/etiquetas/etiqueta-fila-sorter';
import type { EtiquetaFilaItem, EtiquetaFilaResponse } from '@/domain/etiquetas/etiqueta-fila-types';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import {
  etiquetasGeradasRepository,
  type EtiquetaGeradaRecord,
  type EtiquetasGeradasRepository,
} from '@/data/etiquetas/EtiquetasGeradasRepository';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import {
  tiposEstoqueService,
  type TiposEstoqueService,
} from '@/lib/services/tipos-estoque-service';
import { extractCalendarDate, formatLocalTimeHHmm } from '@/lib/utils/date-utils';

type EmbalagemLoteRepositoryPort = Pick<
  typeof embalagemLoteRepository,
  'listOrdemProducaoIdsByProduzidoDate' | 'listByPedidoEmbalagemIds'
>;

type PedidoEmbalagemRepositoryPort = Pick<typeof pedidoEmbalagemRepository, 'findByIds'>;

type ProductServicePort = Pick<SupabaseProductService, 'findByIds'>;

export type EtiquetaFilaServiceDeps = {
  embalagemLoteRepository: EmbalagemLoteRepositoryPort;
  pedidoEmbalagemRepository: PedidoEmbalagemRepositoryPort;
  etiquetasGeradasRepository: Pick<
    EtiquetasGeradasRepository,
    'findByOrdemProducaoIds' | 'findManualByGeradoDate'
  >;
  tiposEstoqueService: Pick<TiposEstoqueService, 'findByIds'>;
  productService: ProductServicePort;
};

function computePrimeiroLoteHorario(
  lotes: EmbalagemLoteRecord[],
  dateIso: string,
): string | undefined {
  const primeiro = findPrimeiroLoteProduzidoDoDia(lotes, dateIso);
  if (!primeiro) return undefined;
  return formatLocalTimeHHmm(primeiro.produzidoEm) ?? undefined;
}

function resolveDataFabricacaoEtiqueta(
  filaDateIso: string,
  gerada?: { dataFabricacao: string },
): string {
  if (gerada) {
    return extractCalendarDate(gerada.dataFabricacao) || gerada.dataFabricacao;
  }
  return filaDateIso;
}

function mapPainelToFilaItem(
  pedido: PedidoEmbalagemRecord,
  painel: ReturnType<typeof buildPainelPedido>,
  tipoNome: string,
  dateIso: string,
  lotes: EmbalagemLoteRecord[],
  dataFabricacaoEtiqueta: string,
  geradoEm?: string,
): EtiquetaFilaItem {
  const primeiroLote = findPrimeiroLoteCriadoDoDia(lotes, dateIso);
  const primeiroLoteHorario = computePrimeiroLoteHorario(lotes, dateIso);
  const lote = loteFromDataFabricacaoEtiqueta(dataFabricacaoEtiqueta) ?? null;

  return {
    origem: 'pedido',
    pedidoEmbalagemId: pedido.id,
    lote,
    pedidoCreatedAt: pedido.createdAt,
    ...(primeiroLote ? { primeiroLoteCreatedAt: primeiroLote.createdAt } : {}),
    produto: painel.produto,
    produtoId: pedido.produtoId,
    tipoEstoque: tipoNome,
    tipoEstoqueId: pedido.tipoEstoqueId,
    dataFabricacao: dataFabricacaoEtiqueta,
    pedido: painel.pedido,
    produzido: painel.produzido,
    unidade: painel.unidade,
    ...(geradoEm ? { geradoEm } : {}),
    ...(primeiroLoteHorario ? { primeiroLoteHorario } : {}),
  };
}

export class EtiquetaFilaService {
  constructor(private readonly deps: EtiquetaFilaServiceDeps = defaultDeps) {}

  private async buildNameMapsByIds(tipoIds: string[], produtoIds: string[]) {
    const [tipos, produtos] = await Promise.all([
      this.deps.tiposEstoqueService.findByIds(tipoIds),
      this.deps.productService.findByIds(produtoIds),
    ]);

    return {
      tipoNomeById: new Map(tipos.map((tipo) => [tipo.id, tipo.nome])),
      produtoNomeById: new Map(produtos.map((produto) => [produto.id, produto.nome])),
      tipoById: new Map(tipos.map((tipo) => [tipo.id, tipo])),
    };
  }

  private async buildManualGerados(records: EtiquetaGeradaRecord[]): Promise<EtiquetaFilaItem[]> {
    if (records.length === 0) return [];

    const tipoIds = [...new Set(records.map((record) => record.tipoEstoqueId))];
    const produtoIds = [...new Set(records.map((record) => record.produtoId))];
    const { tipoNomeById, produtoNomeById } = await this.buildNameMapsByIds(tipoIds, produtoIds);

    return records.map((gerada) =>
      mapManualGeradaToFilaItem(
        gerada,
        produtoNomeById.get(gerada.produtoId) ?? 'Desconhecido',
        tipoNomeById.get(gerada.tipoEstoqueId) ?? 'Desconhecido',
      ),
    );
  }

  private async buildPedidoFila(
    date: string,
    ordemIds: string[],
  ): Promise<{ pendentes: EtiquetaFilaItem[]; gerados: EtiquetaFilaItem[] }> {
    const pedidos = await this.deps.pedidoEmbalagemRepository.findByIds(ordemIds);
    if (pedidos.length === 0) {
      return { pendentes: [], gerados: [] };
    }

    const pedidoIds = pedidos.map((pedido) => pedido.id);
    const [lotesByPedido, nameMaps, geradasMap] = await Promise.all([
      this.deps.embalagemLoteRepository.listByPedidoEmbalagemIds(pedidoIds),
      this.buildNameMapsByIds(
        [...new Set(pedidos.map((pedido) => pedido.tipoEstoqueId))],
        [...new Set(pedidos.map((pedido) => pedido.produtoId))],
      ),
      this.deps.etiquetasGeradasRepository.findByOrdemProducaoIds(pedidoIds),
    ]);

    const pendentes: EtiquetaFilaItem[] = [];
    const gerados: EtiquetaFilaItem[] = [];

    for (const pedido of pedidos) {
      const tipo = nameMaps.tipoById.get(pedido.tipoEstoqueId);
      if (!tipo?.possuiEtiqueta) continue;

      const tipoNome = tipo.nome;
      const produtoNome = nameMaps.produtoNomeById.get(pedido.produtoId) ?? 'Desconhecido';
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
      const dataFabricacaoEtiqueta = resolveDataFabricacaoEtiqueta(date, gerada);
      const item = mapPainelToFilaItem(
        pedido,
        painel,
        tipoNome,
        date,
        lotes,
        dataFabricacaoEtiqueta,
        gerada?.geradoEm,
      );

      if (gerada) {
        gerados.push(item);
      } else {
        pendentes.push(item);
      }
    }

    return { pendentes, gerados };
  }

  async getFilaForDate(date: string): Promise<EtiquetaFilaResponse> {
    const [ordemIds, manualGeradas] = await Promise.all([
      this.deps.embalagemLoteRepository.listOrdemProducaoIdsByProduzidoDate(date),
      this.deps.etiquetasGeradasRepository.findManualByGeradoDate(date),
    ]);

    const pedidoFila =
      ordemIds.length > 0
        ? await this.buildPedidoFila(date, ordemIds)
        : { pendentes: [], gerados: [] };

    const manualGerados = await this.buildManualGerados(manualGeradas);

    return {
      date,
      pendentes: sortEtiquetaFilaItems(pedidoFila.pendentes),
      gerados: sortEtiquetaGeradosFilaItems([...pedidoFila.gerados, ...manualGerados]),
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
