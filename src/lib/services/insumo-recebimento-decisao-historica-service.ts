import { normalizarDescricaoProdutoOmie } from '@/domain/insumos/insumo-produto-descricao-normalizer';
import type { IntegracaoInsumoRow } from '@/domain/types/insumo-estoque-db';
import {
  insumoMapeamentoRepository,
  InsumoMapeamentoRepository,
} from '@/data/insumos/InsumoMapeamentoRepository';
import {
  insumoPendenciaRepository,
  InsumoPendenciaRepository,
} from '@/data/insumos/InsumoPendenciaRepository';

export type InsumoRecebimentoDecisaoHistoricaServiceDeps = {
  mapeamentoRepository: InsumoMapeamentoRepository;
  pendenciaRepository: InsumoPendenciaRepository;
};

export class InsumoRecebimentoDecisaoHistoricaService {
  constructor(private readonly deps: InsumoRecebimentoDecisaoHistoricaServiceDeps) {}

  async produtoFoiIgnoradoAnteriormente(input: {
    empresaId: string;
    omieIdProduto: number;
    descricaoProduto: string | null;
  }): Promise<boolean> {
    const ignoradoPorProduto = await this.deps.pendenciaRepository.existsIgnoradoPorProdutoOmie(
      input.empresaId,
      input.omieIdProduto,
    );
    if (ignoradoPorProduto) {
      return true;
    }

    const descricao = normalizarDescricaoProdutoOmie(input.descricaoProduto);
    if (!descricao) {
      return false;
    }

    return this.deps.pendenciaRepository.existsIgnoradoPorDescricao(
      input.empresaId,
      descricao,
    );
  }

  async resolverMapeamentoPorDescricao(input: {
    empresaId: string;
    omieIdProduto: number;
    omieCodigoProduto: string | null;
    descricaoProduto: string | null;
  }): Promise<IntegracaoInsumoRow | null> {
    const descricao = normalizarDescricaoProdutoOmie(input.descricaoProduto);
    if (!descricao) {
      return null;
    }

    const mapeamentoPorDescricao =
      await this.deps.mapeamentoRepository.findAtivoByDescricaoOmie(
        input.empresaId,
        descricao,
      );

    if (!mapeamentoPorDescricao) {
      return null;
    }

    if (mapeamentoPorDescricao.omie_id_produto === input.omieIdProduto) {
      return mapeamentoPorDescricao;
    }

    return this.deps.mapeamentoRepository.create({
      empresaId: input.empresaId,
      omieIdProduto: input.omieIdProduto,
      omieCodigoProduto: input.omieCodigoProduto,
      insumoId: mapeamentoPorDescricao.insumo_id,
      fatorConversao: Number(mapeamentoPorDescricao.fator_conversao),
      descricaoOmie: input.descricaoProduto,
    });
  }
}

export const insumoRecebimentoDecisaoHistoricaService =
  new InsumoRecebimentoDecisaoHistoricaService({
    mapeamentoRepository: insumoMapeamentoRepository,
    pendenciaRepository: insumoPendenciaRepository,
  });
