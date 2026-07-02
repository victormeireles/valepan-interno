import {
  corrigirEntradaComFatorEmbalagem,
  isEntradaSemFatorEmbalagem,
} from '@/domain/insumos/insumo-entrada-fator';
import type { InsumoEntradaPendenciaRow } from '@/domain/types/insumo-estoque-db';
import { insumoEstoqueRepository, InsumoEstoqueRepository } from '@/data/insumos/InsumoEstoqueRepository';
import { insumoMapeamentoRepository, InsumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { insumoPendenciaRepository, InsumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';

const ENTRADA_ORIGENS = new Set(['entrada_nf', 'resolucao_pendencia']);

export type InsumoEntradaFatorBackfillResult = {
  insumosCorrigidos: number;
  movimentosCorrigidos: number;
  detalhes: Array<{
    insumoNome: string;
    movimentosCorrigidos: number;
    saldoAnterior: number;
    saldoNovo: number;
    custoAnterior: number | null;
    custoNovo: number | null;
  }>;
};

type BackfillDeps = {
  estoqueRepository: InsumoEstoqueRepository;
  pendenciaRepository: InsumoPendenciaRepository;
  mapeamentoRepository: InsumoMapeamentoRepository;
};

export class InsumoEntradaFatorBackfillService {
  constructor(private readonly deps: BackfillDeps) {}

  async executar(dryRun = false): Promise<InsumoEntradaFatorBackfillResult> {
    const insumoIds = await this.deps.estoqueRepository.listInsumoIdsComMovimentoPendencia();
    const resultado: InsumoEntradaFatorBackfillResult = {
      insumosCorrigidos: 0,
      movimentosCorrigidos: 0,
      detalhes: [],
    };

    for (const insumoId of insumoIds) {
      const correcao = await this.corrigirInsumo(insumoId, dryRun);
      if (correcao.movimentosCorrigidos === 0) {
        continue;
      }

      resultado.insumosCorrigidos += 1;
      resultado.movimentosCorrigidos += correcao.movimentosCorrigidos;
      resultado.detalhes.push(correcao);
    }

    return resultado;
  }

  private async corrigirInsumo(
    insumoId: string,
    dryRun: boolean,
  ): Promise<InsumoEntradaFatorBackfillResult['detalhes'][number]> {
    const movimentos = await this.deps.estoqueRepository.listMovimentosCronologicos(insumoId);
    const saldoAnterior = Number(
      (await this.deps.estoqueRepository.findSaldo(insumoId))?.quantidade ?? 0,
    );
    const custoAnterior = await this.deps.estoqueRepository.findInsumoCustoUnitario(insumoId);

    let saldo = 0;
    let movimentosCorrigidos = 0;
    let ultimoCustoEntrada = custoAnterior;
    let insumoNome = insumoId;

    for (const movimento of movimentos) {
      let delta = Number(movimento.delta_quantidade);
      let custo = Number(movimento.custo_unitario);
      let corrigido = false;

      if (
        movimento.pendencia_id &&
        ENTRADA_ORIGENS.has(movimento.origem) &&
        movimento.empresa_id
      ) {
        const pendencia = await this.deps.pendenciaRepository.findById(movimento.pendencia_id);
        const mapeamento = pendencia
          ? await this.deps.mapeamentoRepository.findByEmpresaProduto(
              movimento.empresa_id,
              pendencia.omie_id_produto,
            )
          : null;

        if (pendencia && mapeamento) {
          insumoNome = pendencia.descricao_produto ?? insumoNome;
          const correcao = this.avaliarCorrecao(pendencia, mapeamento.fator_conversao, delta, custo);
          if (correcao) {
            delta = correcao.deltaQuantidade;
            custo = correcao.custoUnitario;
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
      await this.deps.estoqueRepository.upsertSaldo(insumoId, saldo);
      if (ultimoCustoEntrada != null) {
        await this.deps.estoqueRepository.updateInsumoCustoUnitario(insumoId, ultimoCustoEntrada);
      }
    }

    return {
      insumoNome,
      movimentosCorrigidos,
      saldoAnterior,
      saldoNovo: movimentosCorrigidos > 0 ? saldo : saldoAnterior,
      custoAnterior,
      custoNovo: movimentosCorrigidos > 0 ? ultimoCustoEntrada : custoAnterior,
    };
  }

  private avaliarCorrecao(
    pendencia: InsumoEntradaPendenciaRow,
    fatorConversao: number,
    deltaQuantidade: number,
    custoUnitario: number,
  ) {
    const input = {
      deltaQuantidade,
      custoUnitario,
      quantidadeNf: Number(pendencia.quantidade_nf),
      valorTotalItem: Number(pendencia.valor_total_item),
      precoUnitNf: pendencia.preco_unit_nf != null ? Number(pendencia.preco_unit_nf) : null,
      unidadeNf: pendencia.unidade_nf,
      fatorConversao: Number(fatorConversao),
    };

    if (!isEntradaSemFatorEmbalagem(input)) {
      return null;
    }

    return corrigirEntradaComFatorEmbalagem(input);
  }
}

export const insumoEntradaFatorBackfillService = new InsumoEntradaFatorBackfillService({
  estoqueRepository: insumoEstoqueRepository,
  pendenciaRepository: insumoPendenciaRepository,
  mapeamentoRepository: insumoMapeamentoRepository,
});
