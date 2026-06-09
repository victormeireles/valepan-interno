import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { appendEmbalagemProducaoRow } from '@/domain/embalagem/pedido-sheet-ops';
import { loteToPedidoKey } from '@/domain/embalagem/pedido-key-from-lote';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import type {
  EmbalagemLoteFotos,
  EmbalagemLoteInsert,
  EmbalagemLoteRecord,
} from '@/domain/types/embalagem-lote';
import type { Quantidade } from '@/domain/types/inventario';
import {
  estoqueResolverService,
  EstoqueResolverError,
} from '@/lib/services/estoque-resolver-service';
import { pedidoEmbalagemService } from '@/lib/services/pedido-embalagem-service';
import { normalizeToISODate } from '@/lib/utils/date-utils';

export { EstoqueResolverError };

export type CriarLoteParcialInput = {
  planilhaRowId: number;
  planilhaRowIdOrigem: number;
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  produto: string;
  congelado: string;
  lote?: string | number | null;
  quantidade: Quantidade;
  produzidoEm?: string;
  observacaoCliente?: string;
  obsEmbalagem?: string;
  fotos?: EmbalagemLoteFotos;
};

export type CriarLoteSubstituicaoInput = {
  planilhaRowId: number;
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  produto: string;
  congelado: string;
  lote?: string | number | null;
  quantidade: Quantidade;
  producaoAnterior: Quantidade;
  produzidoEm?: string;
  observacaoCliente?: string;
  obsEmbalagem?: string;
  fotos?: EmbalagemLoteFotos;
};

export type CriarLotePorPedidoInput = {
  pedidoEmbalagemId: string;
  clienteNome: string;
  produtoNome: string;
  congelado: string;
  quantidade: Quantidade;
  produzidoEm?: string;
  obsEmbalagem?: string;
  fotos?: EmbalagemLoteFotos;
};

export class EmbalagemLoteService {
  private async resolvePedidoEmbalagemIdForLote(
    tipoEstoqueId: string,
    produtoId: string,
    dataPedido: string,
    dataFabricacao: string,
    observacaoCliente: string,
  ): Promise<string | null> {
    const { assadeiraId } = await pedidoEmbalagemService.resolveAssadeiraDefault(
      produtoId,
    );
    return pedidoEmbalagemService.resolvePedidoEmbalagemId(
      loteToPedidoKey({
        dataPedido,
        dataFabricacao,
        tipoEstoqueId,
        produtoId,
        observacaoCliente,
        assadeiraId,
      }),
    );
  }
  async resolveIds(
    cliente: string,
    produto: string,
  ): Promise<{ tipoEstoqueId: string; produtoId: string }> {
    const tipoEstoqueId = await estoqueResolverService.resolveTipoEstoqueFromCliente(
      cliente,
    );
    const produtoId = await estoqueResolverService.resolveProdutoId(produto);
    return { tipoEstoqueId, produtoId };
  }

  async criarLote(input: EmbalagemLoteInsert): Promise<EmbalagemLoteRecord> {
    const existing = await embalagemLoteRepository.findByPlanilhaRowId(
      input.planilhaRowId,
    );
    if (existing) {
      throw new Error(
        `Lote já existe para planilha_row_id=${input.planilhaRowId}`,
      );
    }
    return embalagemLoteRepository.insert(input);
  }

  async criarLoteParcial(input: CriarLoteParcialInput): Promise<EmbalagemLoteRecord> {
    const { tipoEstoqueId, produtoId } = await this.resolveIds(
      input.cliente,
      input.produto,
    );
    const loteNum =
      input.lote !== '' && input.lote != null ? Number(input.lote) : null;
    const dataPedido = normalizeToISODate(input.dataPedido);
    const dataFabricacao = normalizeToISODate(input.dataFabricacao);
    const pedidoEmbalagemId = await this.resolvePedidoEmbalagemIdForLote(
      tipoEstoqueId,
      produtoId,
      dataPedido,
      dataFabricacao,
      input.observacaoCliente ?? '',
    );

    return this.criarLote({
      modo: 'parcial',
      planilhaRowId: input.planilhaRowId,
      planilhaRowIdOrigem: input.planilhaRowIdOrigem,
      pedidoEmbalagemId,
      dataPedido,
      dataFabricacao,
      tipoEstoqueId,
      produtoId,
      congelado: input.congelado === 'Sim' ? 'Sim' : 'Não',
      lote: Number.isFinite(loteNum) ? loteNum : null,
      quantidade: input.quantidade,
      produzidoEm: input.produzidoEm ?? new Date().toISOString(),
      obsEmbalagem: input.obsEmbalagem ?? null,
      fotos: input.fotos,
    });
  }

  async criarLoteSubstituicao(
    input: CriarLoteSubstituicaoInput,
  ): Promise<EmbalagemLoteRecord> {
    const { tipoEstoqueId, produtoId } = await this.resolveIds(
      input.cliente,
      input.produto,
    );
    const loteNum =
      input.lote !== '' && input.lote != null ? Number(input.lote) : null;
    const dataPedido = normalizeToISODate(input.dataPedido);
    const dataFabricacao = normalizeToISODate(input.dataFabricacao);
    const pedidoEmbalagemId = await this.resolvePedidoEmbalagemIdForLote(
      tipoEstoqueId,
      produtoId,
      dataPedido,
      dataFabricacao,
      input.observacaoCliente ?? '',
    );

    const payload: EmbalagemLoteInsert = {
      modo: 'substituicao',
      planilhaRowId: input.planilhaRowId,
      pedidoEmbalagemId,
      dataPedido,
      dataFabricacao,
      tipoEstoqueId,
      produtoId,
      congelado: input.congelado === 'Sim' ? 'Sim' : 'Não',
      lote: Number.isFinite(loteNum) ? loteNum : null,
      quantidade: input.quantidade,
      producaoAnterior: input.producaoAnterior,
      produzidoEm: input.produzidoEm ?? new Date().toISOString(),
      obsEmbalagem: input.obsEmbalagem ?? null,
      fotos: input.fotos,
    };

    const existing = await embalagemLoteRepository.findByPlanilhaRowId(
      input.planilhaRowId,
    );
    if (existing) {
      return embalagemLoteRepository.updateByPlanilhaRowId(
        input.planilhaRowId,
        payload,
      );
    }

    return embalagemLoteRepository.insert(payload);
  }

  async criarLotePorPedidoEmbalagem(
    input: CriarLotePorPedidoInput,
  ): Promise<EmbalagemLoteRecord> {
    const pedido = await pedidoEmbalagemRepository.findById(input.pedidoEmbalagemId);
    if (!pedido) {
      throw new Error('Pedido de embalagem não encontrado');
    }

    const q = {
      caixas: input.quantidade.caixas,
      pacotes: input.quantidade.pacotes,
      unidades: input.quantidade.unidades,
      kg: input.quantidade.kg,
    };

    if (q.caixas + q.pacotes + q.unidades + q.kg <= 0) {
      throw new Error('Informe ao menos uma quantidade maior que zero (cx, pct, un ou kg).');
    }

    const planilhaRowId = await appendEmbalagemProducaoRow({
      dataPedido: pedido.dataProducao,
      dataFabricacao: pedido.dataFabricacaoEtiqueta,
      cliente: input.clienteNome,
      observacao: pedido.observacao,
      produto: input.produtoNome,
      congelado: input.congelado,
      quantidade: q,
      obsEmbalagem: input.obsEmbalagem,
      fotos: input.fotos,
    });

    const produzidoEm = input.produzidoEm ?? new Date().toISOString();

    return this.criarLote({
      modo: 'parcial',
      planilhaRowId,
      planilhaRowIdOrigem: null,
      pedidoEmbalagemId: pedido.id,
      dataPedido: pedido.dataProducao,
      dataFabricacao: pedido.dataFabricacaoEtiqueta,
      tipoEstoqueId: pedido.tipoEstoqueId,
      produtoId: pedido.produtoId,
      congelado: input.congelado === 'Sim' ? 'Sim' : 'Não',
      lote: null,
      quantidade: q,
      produzidoEm,
      obsEmbalagem: input.obsEmbalagem ?? null,
      fotos: input.fotos,
    });
  }

  async syncFotosFromPlanilhaRow(
    planilhaRowId: number,
    fotos: EmbalagemLoteFotos,
  ): Promise<void> {
    await embalagemLoteRepository.updateFotosByPlanilhaRowId(planilhaRowId, fotos);
  }

  async compensarLote(loteId: string): Promise<void> {
    await embalagemLoteRepository.deleteById(loteId);
  }
}

export const embalagemLoteService = new EmbalagemLoteService();
