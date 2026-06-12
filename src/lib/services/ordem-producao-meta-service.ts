import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import {
  assadeirasFromSheetQuantidade,
  deriveQuantidadesFromAssadeiras,
  deriveQuantidadesFromUnidades,
} from '@/domain/producao/ordem-derivados';
import type { OrdemProducaoRecord, OrdemProducaoUpsert } from '@/domain/types/ordem-producao';
import {
  pedidoEmbalagemService,
  EstoqueResolverError,
} from '@/lib/services/pedido-embalagem-service';
import { estoqueResolverService } from '@/lib/services/estoque-resolver-service';

export { EstoqueResolverError };

import type { DerivedQuantidades } from '@/domain/producao/ordem-derivados';

export type CreateFromLatasInput = {
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  latas: number;
  observacao: string;
};

export type UpdateFieldsInput = {
  dataProducao?: string;
  dataEtiqueta?: string;
  tipoEstoque?: string;
  produto?: string;
  observacao?: string;
  latas?: number;
  quantidade?: DerivedQuantidades;
};

export type CreateFromQuantidadeInput = {
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao: string;
  quantidade: DerivedQuantidades;
};

export type CreateFromUnidadesInput = {
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao: string;
  unidades: number;
};

type AssadeiraContext = {
  assadeiraId: string;
  unidadesPorAssadeiraEfetiva: number;
  boxUnits: number | null;
};

export class OrdemProducaoMetaService {
  async buildUpsertFromLatas(
    input: CreateFromLatasInput,
    ordemPlanejamento?: number,
  ): Promise<OrdemProducaoUpsert> {
    const { tipoEstoqueId, produtoId } = await pedidoEmbalagemService.resolveIds(
      input.tipoEstoque,
      input.produto,
    );
    const assadeira = await pedidoEmbalagemService.resolveAssadeiraDefault(produtoId);
    const quantidade = deriveQuantidadesFromAssadeiras({
      assadeiras: input.latas,
      unidadesPorAssadeira: assadeira.unidadesPorAssadeiraEfetiva,
      boxUnits: assadeira.boxUnits,
    });
    const ordem =
      ordemPlanejamento ??
      (await ordemProducaoRepository.nextOrdemPlanejamento(input.dataProducao));

    return {
      dataProducao: input.dataProducao,
      dataFabricacaoEtiqueta: input.dataEtiqueta,
      tipoEstoqueId,
      produtoId,
      observacao: input.observacao,
      assadeiraId: assadeira.assadeiraId,
      assadeiras: input.latas,
      ordemPlanejamento: ordem,
      quantidade,
    };
  }

  async createFromLatas(input: CreateFromLatasInput): Promise<OrdemProducaoRecord> {
    await pedidoEmbalagemService.validatePayloadItems(input.tipoEstoque, [input.produto]);
    const upsert = await this.buildUpsertFromLatas(input);
    const [record] = await ordemProducaoRepository.upsertMany([upsert]);
    return record;
  }

  async createSemAssadeira(input: CreateFromUnidadesInput): Promise<OrdemProducaoRecord> {
    await pedidoEmbalagemService.validatePayloadItems(input.tipoEstoque, [input.produto]);

    const { tipoEstoqueId, produtoId } = await pedidoEmbalagemService.resolveIds(
      input.tipoEstoque,
      input.produto,
    );

    const hasAssadeira = await pedidoEmbalagemService.hasAssadeiraForProduto(produtoId);
    if (hasAssadeira) {
      throw new EstoqueResolverError(
        `Produto "${input.produto}" possui assadeira — use latas para criar a meta`,
      );
    }

    if (!Number.isFinite(input.unidades) || input.unidades <= 0) {
      throw new EstoqueResolverError('Informe ao menos 1 unidade');
    }

    const boxUnits = await pedidoEmbalagemService.resolveBoxUnitsForProduto(produtoId);
    const quantidade = deriveQuantidadesFromUnidades({
      unidades: input.unidades,
      boxUnits,
    });

    const ordem = await ordemProducaoRepository.nextOrdemPlanejamento(input.dataProducao);

    const [record] = await ordemProducaoRepository.upsertMany([
      {
        dataProducao: input.dataProducao,
        dataFabricacaoEtiqueta: input.dataEtiqueta,
        tipoEstoqueId,
        produtoId,
        observacao: input.observacao,
        assadeiraId: '',
        assadeiras: 0,
        ordemPlanejamento: ordem,
        quantidade,
      },
    ]);
    return record;
  }

  async createFromQuantidade(input: CreateFromQuantidadeInput): Promise<OrdemProducaoRecord> {
    await pedidoEmbalagemService.validatePayloadItems(input.tipoEstoque, [input.produto]);
    const { tipoEstoqueId, produtoId } = await pedidoEmbalagemService.resolveIds(
      input.tipoEstoque,
      input.produto,
    );
    const assadeira = await pedidoEmbalagemService.resolveAssadeiraDefault(produtoId);
    const assadeiras = assadeirasFromSheetQuantidade(input.quantidade, {
      unidadesPorAssadeira: assadeira.unidadesPorAssadeiraEfetiva,
      boxUnits: assadeira.boxUnits,
    });
    const ordem = await ordemProducaoRepository.nextOrdemPlanejamento(input.dataProducao);
    const [record] = await ordemProducaoRepository.upsertMany([
      {
        dataProducao: input.dataProducao,
        dataFabricacaoEtiqueta: input.dataEtiqueta,
        tipoEstoqueId,
        produtoId,
        observacao: input.observacao,
        assadeiraId: assadeira.assadeiraId,
        assadeiras,
        ordemPlanejamento: ordem,
        quantidade: input.quantidade,
      },
    ]);
    return record;
  }

  private async assertMetaNotBelowProduzido(
    id: string,
    latas: number,
    assadeira: AssadeiraContext,
    produtoLabel: string,
  ): Promise<void> {
    const produzido = await embalagemLoteRepository.sumQuantidadeByPedidoId(id);
    const totalProduzido =
      produzido.caixas + produzido.pacotes + produzido.unidades + produzido.kg;
    if (totalProduzido <= 0) return;

    const produzidoLatas = assadeirasFromSheetQuantidade(produzido, {
      unidadesPorAssadeira: assadeira.unidadesPorAssadeiraEfetiva,
      boxUnits: assadeira.boxUnits,
    });
    if (latas < produzidoLatas - 1e-6) {
      throw new Error(
        `Meta (${latas} latas) menor que produzido (~${produzidoLatas.toFixed(2)} latas) para ${produtoLabel}`,
      );
    }
  }

  async updateQuantidade(id: string, latas: number): Promise<OrdemProducaoRecord> {
    const existing = await ordemProducaoRepository.findById(id);
    if (!existing) throw new Error('Pedido não encontrado');

    const assadeira = await pedidoEmbalagemService.resolveAssadeiraDefault(existing.produtoId);
    await this.assertMetaNotBelowProduzido(id, latas, assadeira, existing.produtoId);

    const quantidade = deriveQuantidadesFromAssadeiras({
      assadeiras: latas,
      unidadesPorAssadeira: assadeira.unidadesPorAssadeiraEfetiva,
      boxUnits: assadeira.boxUnits,
    });

    return ordemProducaoRepository.updateQuantidades(id, {
      assadeiraId: assadeira.assadeiraId,
      assadeiras: latas,
      quantidade,
    });
  }

  async updateFields(id: string, fields: UpdateFieldsInput): Promise<OrdemProducaoRecord> {
    const existing = await ordemProducaoRepository.findById(id);
    if (!existing) throw new Error('Pedido não encontrado');

    const tipoEstoqueNome = fields.tipoEstoque;
    const produtoNome = fields.produto;
    let tipoEstoqueId = existing.tipoEstoqueId;
    let produtoId = existing.produtoId;

    if (tipoEstoqueNome) {
      tipoEstoqueId = await estoqueResolverService.resolveTipoEstoqueFromCliente(
        tipoEstoqueNome,
      );
    }
    if (produtoNome) {
      produtoId = await estoqueResolverService.resolveProdutoId(produtoNome);
    }

    const assadeira = await pedidoEmbalagemService.resolveAssadeiraDefault(produtoId);

    let quantidade: DerivedQuantidades;
    let assadeiras: number;

    if (fields.quantidade) {
      quantidade = fields.quantidade;
      assadeiras = assadeirasFromSheetQuantidade(quantidade, {
        unidadesPorAssadeira: assadeira.unidadesPorAssadeiraEfetiva,
        boxUnits: assadeira.boxUnits,
      });
    } else {
      assadeiras = fields.latas ?? existing.assadeiras;
      quantidade = deriveQuantidadesFromAssadeiras({
        assadeiras,
        unidadesPorAssadeira: assadeira.unidadesPorAssadeiraEfetiva,
        boxUnits: assadeira.boxUnits,
      });
    }

    await this.assertMetaNotBelowProduzido(id, assadeiras, assadeira, produtoId);

    return ordemProducaoRepository.updatePedidoFields(id, {
      dataProducao: fields.dataProducao ?? existing.dataProducao,
      dataFabricacaoEtiqueta: fields.dataEtiqueta ?? existing.dataFabricacaoEtiqueta,
      tipoEstoqueId,
      produtoId,
      observacao: fields.observacao ?? existing.observacao,
      assadeiraId: assadeira.assadeiraId,
      assadeiras,
      ordemPlanejamento: existing.ordemPlanejamento,
      quantidade,
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await ordemProducaoRepository.findById(id);
    if (!existing) throw new Error('Pedido não encontrado');

    const produzido = await embalagemLoteRepository.sumQuantidadeByPedidoId(id);
    const totalProduzido =
      produzido.caixas + produzido.pacotes + produzido.unidades + produzido.kg;
    if (totalProduzido > 0) {
      throw new Error('Não é possível excluir pedido com produção registrada');
    }

    await ordemProducaoRepository.deleteById(id);
  }
}

export const ordemProducaoMetaService = new OrdemProducaoMetaService();
