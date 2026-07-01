import {
  insumoEstoqueRepository,
  InsumoEstoqueRepository,
  type InsumoMovimentoLoteColuna,
} from '@/data/insumos/InsumoEstoqueRepository';
import type { InsumoConsumoCalculado } from '@/domain/insumos/insumo-consumo-producao-types';
import type { InsumoMovimentoOrigem } from '@/domain/types/insumo-estoque';
import {
  insumoEstoqueService,
  InsumoEstoqueService,
} from '@/lib/services/insumo-estoque-service';

type VinculoLote = { coluna: InsumoMovimentoLoteColuna; loteId: string };

/**
 * Reconcilia o consumo de insumos de um lote de produção usando ledger
 * append-only: compara o alvo calculado com o que já foi registrado para o lote
 * e insere apenas o delta necessário (inclusive positivo, ao reduzir/estornar).
 */
export class InsumoConsumoAplicador {
  constructor(
    private readonly estoqueRepository: InsumoEstoqueRepository = insumoEstoqueRepository,
    private readonly estoqueService: InsumoEstoqueService = insumoEstoqueService,
  ) {}

  private vinculoInput(vinculo: VinculoLote): {
    fermentacaoLoteId?: string;
    fornoLoteId?: string;
    embalagemLoteId?: string;
  } {
    if (vinculo.coluna === 'fermentacao_lote_id') {
      return { fermentacaoLoteId: vinculo.loteId };
    }
    if (vinculo.coluna === 'forno_lote_id') {
      return { fornoLoteId: vinculo.loteId };
    }
    return { embalagemLoteId: vinculo.loteId };
  }

  async reconciliar(params: {
    vinculo: VinculoLote;
    origem: InsumoMovimentoOrigem;
    consumosAlvo: InsumoConsumoCalculado[];
    observacao: string;
  }): Promise<void> {
    const { vinculo, origem, consumosAlvo, observacao } = params;
    const deltasAtuais = await this.estoqueRepository.sumDeltaByLoteInsumo(
      vinculo.coluna,
      vinculo.loteId,
    );
    const alvoMap = new Map(consumosAlvo.map((c) => [c.insumoId, c.quantidade]));
    const insumoIds = new Set([...deltasAtuais.keys(), ...alvoMap.keys()]);

    for (const insumoId of insumoIds) {
      const consumoAlvo = alvoMap.get(insumoId) ?? 0;
      const deltaJaRegistrado = deltasAtuais.get(insumoId) ?? 0;
      const deltaNecessario = -consumoAlvo - deltaJaRegistrado;
      if (deltaNecessario === 0) continue;

      await this.estoqueService.aplicarDelta({
        insumoId,
        delta: deltaNecessario,
        origem,
        observacao,
        ...this.vinculoInput(vinculo),
      });
    }
  }

  async estornar(params: {
    vinculo: VinculoLote;
    origem: InsumoMovimentoOrigem;
    observacao: string;
  }): Promise<boolean> {
    const { vinculo, origem, observacao } = params;
    const deltas = await this.estoqueRepository.sumDeltaByLoteInsumo(
      vinculo.coluna,
      vinculo.loteId,
    );
    if (deltas.size === 0) return false;

    for (const [insumoId, deltaTotal] of deltas) {
      if (deltaTotal >= 0) continue;
      await this.estoqueService.aplicarDelta({
        insumoId,
        delta: -deltaTotal,
        origem,
        observacao,
        ...this.vinculoInput(vinculo),
      });
    }

    await this.estoqueRepository.clearLoteId(vinculo.coluna, vinculo.loteId);
    return true;
  }
}

export const insumoConsumoAplicador = new InsumoConsumoAplicador();
