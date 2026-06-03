import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
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
  obsEmbalagem?: string;
  fotos?: EmbalagemLoteFotos;
};

export class EmbalagemLoteService {
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

    return this.criarLote({
      modo: 'parcial',
      planilhaRowId: input.planilhaRowId,
      planilhaRowIdOrigem: input.planilhaRowIdOrigem,
      dataPedido: normalizeToISODate(input.dataPedido),
      dataFabricacao: normalizeToISODate(input.dataFabricacao),
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

    const payload: EmbalagemLoteInsert = {
      modo: 'substituicao',
      planilhaRowId: input.planilhaRowId,
      dataPedido: normalizeToISODate(input.dataPedido),
      dataFabricacao: normalizeToISODate(input.dataFabricacao),
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

  async compensarLote(loteId: string): Promise<void> {
    await embalagemLoteRepository.deleteById(loteId);
  }
}

export const embalagemLoteService = new EmbalagemLoteService();
