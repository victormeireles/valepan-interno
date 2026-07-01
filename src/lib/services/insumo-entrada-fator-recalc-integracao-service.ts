import {
  corrigirEntradaComFatorEmbalagem,
  isEntradaSemFatorEmbalagem,
  recalcularEntradaComFator,
} from '@/domain/insumos/insumo-entrada-fator';
import type {
  InsumoEntradaPendenciaRow,
  InsumoMovimentoRow,
} from '@/domain/types/insumo-estoque-db';
import { insumoEstoqueRepository, InsumoEstoqueRepository } from '@/data/insumos/InsumoEstoqueRepository';
import { insumoMapeamentoRepository, InsumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { insumoPendenciaRepository, InsumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';

const ENTRADA_ORIGENS = new Set(['entrada_nf', 'resolucao_pendencia']);

export type InsumoEntradaFatorRecalcIntegracaoResult = {
  movimentosAnalisados: number;
  movimentosCorrigidos: number;
  saldoAnterior: number;
  saldoNovo: number;
  custoAnterior: number;
  custoNovo: number;
};

type RecalcDeps = {
  estoqueRepository: InsumoEstoqueRepository;
  pendenciaRepository: InsumoPendenciaRepository;
  mapeamentoRepository: InsumoMapeamentoRepository;
};

function pendenciaParaRecalc(pendencia: InsumoEntradaPendenciaRow) {
  return {
    quantidadeNf: Number(pendencia.quantidade_nf),
    valorTotalItem: Number(pendencia.valor_total_item),
    precoUnitNf: pendencia.preco_unit_nf != null ? Number(pendencia.preco_unit_nf) : null,
    unidadeNf: pendencia.unidade_nf,
  };
}

function valoresEntradaAlterados(
  deltaAtual: number,
  custoAtual: number,
  deltaNovo: number,
  custoNovo: number,
): boolean {
  return Math.abs(deltaAtual - deltaNovo) > 0.01 || Math.abs(custoAtual - custoNovo) > 0.001;
}

export class InsumoEntradaFatorRecalcIntegracaoService {
  constructor(private readonly deps: RecalcDeps) {}

  async previewPorIntegracao(integracaoId: string, fatorNovo: number) {
    return this.processarIntegracao(integracaoId, fatorNovo, true);
  }

  async executarPorIntegracao(integracaoId: string, fatorNovo: number) {
    return this.processarIntegracao(integracaoId, fatorNovo, false);
  }

  private async processarIntegracao(
    integracaoId: string,
    fatorNovo: number,
    dryRun: boolean,
  ): Promise<InsumoEntradaFatorRecalcIntegracaoResult> {
    const integracao = await this.deps.mapeamentoRepository.findById(integracaoId);
    if (!integracao || !integracao.ativo) {
      throw new Error('Vínculo não encontrado');
    }

    if (fatorNovo <= 0) {
      throw new Error('Fator de conversão inválido');
    }

    const movimentos = await this.deps.estoqueRepository.listMovimentosCronologicos(
      integracao.insumo_id,
    );
    const saldoAnterior = Number(
      (await this.deps.estoqueRepository.findSaldo(integracao.insumo_id))?.quantidade ?? 0,
    );
    const custoAnterior = await this.deps.estoqueRepository.findInsumoCustoUnitario(
      integracao.insumo_id,
    );

    let saldo = 0;
    let movimentosAnalisados = 0;
    let movimentosCorrigidos = 0;
    let ultimoCustoEntrada = custoAnterior;

    for (const movimento of movimentos) {
      let delta = Number(movimento.delta_quantidade);
      let custo = Number(movimento.custo_unitario);
      let corrigido = false;

      if (ENTRADA_ORIGENS.has(movimento.origem)) {
        const recalc = await this.recalcularMovimentoSeAplicavel(
          movimento,
          integracao.empresa_id,
          integracao.omie_id_produto,
          fatorNovo,
        );

        if (recalc) {
          movimentosAnalisados += 1;
          if (valoresEntradaAlterados(delta, custo, recalc.deltaQuantidade, recalc.custoUnitario)) {
            delta = recalc.deltaQuantidade;
            custo = recalc.custoUnitario;
            movimentosCorrigidos += 1;
            corrigido = true;
          }
        }
      }

      saldo += delta;

      if (!dryRun && (corrigido || Number(movimento.saldo_resultante) !== saldo)) {
        await this.deps.estoqueRepository.updateMovimentoCorrecao(movimento.id, {
          deltaQuantidade: delta,
          custoUnitario: custo,
          saldoResultante: saldo,
        });
      }

      if (ENTRADA_ORIGENS.has(movimento.origem)) {
        ultimoCustoEntrada = custo;
      }
    }

    if (!dryRun && movimentosCorrigidos > 0) {
      await this.deps.estoqueRepository.upsertSaldo(integracao.insumo_id, saldo);
      await this.deps.estoqueRepository.updateInsumoCustoUnitario(
        integracao.insumo_id,
        ultimoCustoEntrada,
      );
    }

    return {
      movimentosAnalisados,
      movimentosCorrigidos,
      saldoAnterior,
      saldoNovo: movimentosCorrigidos > 0 ? saldo : saldoAnterior,
      custoAnterior,
      custoNovo: movimentosCorrigidos > 0 ? ultimoCustoEntrada : custoAnterior,
    };
  }

  private async recalcularMovimentoSeAplicavel(
    movimento: InsumoMovimentoRow,
    empresaId: string,
    omieIdProduto: number,
    fatorConversao: number,
  ): Promise<{ deltaQuantidade: number; custoUnitario: number } | null> {
    if (movimento.empresa_id && movimento.empresa_id !== empresaId) {
      return null;
    }

    const pendencia = await this.resolverPendenciaMovimento(movimento);

    if (pendencia) {
      if (pendencia.omie_id_produto !== omieIdProduto) {
        return null;
      }

      return recalcularEntradaComFator(pendenciaParaRecalc(pendencia), fatorConversao);
    }

    if (movimento.origem !== 'entrada_nf') {
      return null;
    }

    return this.tentarRecalcHeuristico(movimento, fatorConversao);
  }

  private async resolverPendenciaMovimento(
    movimento: InsumoMovimentoRow,
  ): Promise<InsumoEntradaPendenciaRow | null> {
    if (movimento.pendencia_id) {
      return this.deps.pendenciaRepository.findById(movimento.pendencia_id);
    }

    if (
      movimento.empresa_id &&
      movimento.omie_n_id_receb != null &&
      movimento.omie_n_id_item != null
    ) {
      return this.deps.pendenciaRepository.findByRecebimentoItem(
        movimento.empresa_id,
        movimento.omie_n_id_receb,
        movimento.omie_n_id_item,
      );
    }

    return null;
  }

  private tentarRecalcHeuristico(
    movimento: InsumoMovimentoRow,
    fatorConversao: number,
  ): { deltaQuantidade: number; custoUnitario: number } | null {
    const deltaAtual = Number(movimento.delta_quantidade);
    const custoAtual = Number(movimento.custo_unitario);

    const input = {
      deltaQuantidade: deltaAtual,
      custoUnitario: custoAtual,
      quantidadeNf: deltaAtual,
      valorTotalItem: deltaAtual * custoAtual,
      precoUnitNf: custoAtual,
      unidadeNf: 'FD',
      fatorConversao,
    };

    if (!isEntradaSemFatorEmbalagem(input)) {
      return null;
    }

    return corrigirEntradaComFatorEmbalagem(input);
  }
}

export const insumoEntradaFatorRecalcIntegracaoService =
  new InsumoEntradaFatorRecalcIntegracaoService({
    estoqueRepository: insumoEstoqueRepository,
    pendenciaRepository: insumoPendenciaRepository,
    mapeamentoRepository: insumoMapeamentoRepository,
  });
