/**
 * Calculadora de progresso de produção
 * Responsabilidade: Calcular percentuais, receitas restantes e progresso geral
 */

import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import {
  ProductionProgress,
  ProductionStep,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';
import { getQuantityByStation, ProductConversionInfo } from '@/lib/utils/production-conversions';
import { sumReceitasBatidasFromMassaLogs } from '@/lib/utils/sum-receitas-massa-logs';

export class ProductionProgressCalculator {
  constructor(
    private readonly stepRepository: ProductionStepRepository,
    private readonly orderRepository: ProductionOrderRepository,
  ) {}

  /**
   * Calcula o progresso completo de uma ordem de produção
   */
  async calculateProgress(
    ordemProducaoId: string,
    productInfo: ProductConversionInfo,
  ): Promise<ProductionProgress> {
    const order = await this.orderRepository.findById(ordemProducaoId);
    if (!order) {
      throw new Error('Ordem de produção não encontrada');
    }

    const logs = await this.stepRepository.findByOrderId(ordemProducaoId);

    // Calcula quantidade produzida (última etapa concluída)
    const qtdProduzida = this.calculateQtdProduzida(logs);

    // Calcula receitas batidas (soma de todas as receitas da etapa massa)
    const receitasBatidas = this.calculateReceitasBatidas(logs);

    // Calcula receitas necessárias
    const receitasNecessarias = this.calculateReceitasNecessarias(
      order.qtd_planejada,
      productInfo,
    );

    // Etapa atual
    const etapaAtual = this.getCurrentStep(logs, order.status);

    // Próxima etapa
    const proximaEtapa = this.getNextStep(etapaAtual);

    return {
      ordem_producao_id: ordemProducaoId,
      qtd_planejada: order.qtd_planejada,
      qtd_produzida: qtdProduzida,
      percentual_completo: (qtdProduzida / order.qtd_planejada) * 100,
      receitas_batidas: receitasBatidas,
      receitas_necessarias: receitasNecessarias,
      receitas_restantes: Math.max(0, receitasNecessarias - receitasBatidas),
      etapa_atual: etapaAtual,
      proxima_etapa: proximaEtapa,
    };
  }

  /**
   * Calcula quantidade produzida baseado na última etapa concluída
   */
  private calculateQtdProduzida(logs: ProductionStepLog[]): number {
    // Ordena logs por ordem de etapas
    const stepOrder: ProductionStep[] = [
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
    ];
    const completedLogs = logs
      .filter((log) => log.fim !== null)
      .sort((a, b) => {
        const aIndex = stepOrder.indexOf(a.etapa);
        const bIndex = stepOrder.indexOf(b.etapa);
        return bIndex - aIndex; // Mais recente primeiro
      });

    // Retorna qtd_saida da última etapa concluída
    if (completedLogs.length > 0) {
      return completedLogs[0].qtd_saida || 0;
    }

    return 0;
  }

  /**
   * Soma receitas batidas de todos os logs de massa (cada log = um lote em producao_etapas_log).
   */
  private calculateReceitasBatidas(logs: ProductionStepLog[]): number {
    return sumReceitasBatidasFromMassaLogs(logs);
  }

  /**
   * Calcula receitas necessárias baseado na quantidade planejada
   */
  private calculateReceitasNecessarias(
    qtdPlanejada: number,
    productInfo: ProductConversionInfo,
  ): number {
    const stationQuantity = getQuantityByStation('massa', qtdPlanejada, productInfo);
    return stationQuantity.receitas?.value || 0;
  }

  /**
   * Determina etapa atual baseado nos logs
   */
  private getCurrentStep(
    logs: ProductionStepLog[],
    orderStatus: string,
  ): ProductionStep | null {
    const emAndamento = logs.filter((log) => log.fim === null);
    if (emAndamento.length > 0) {
      const etapas = new Set(emAndamento.map((l) => l.etapa));
      if (etapas.size === 1) {
        return emAndamento[0].etapa;
      }
      const prior = emAndamento.find(
        (l) =>
          l.etapa !== 'entrada_forno' &&
          l.etapa !== 'saida_forno' &&
          l.etapa !== 'entrada_embalagem' &&
          l.etapa !== 'saida_embalagem',
      );
      return (prior ?? emAndamento[0]).etapa;
    }

    // Caso contrário, usa o status da ordem
    const validSteps: ProductionStep[] = [
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
    ];
    if (validSteps.includes(orderStatus as ProductionStep)) {
      return orderStatus as ProductionStep;
    }

    return null;
  }

  /**
   * Retorna próxima etapa
   */
  private getNextStep(etapa: ProductionStep | null): ProductionStep | null {
    if (!etapa) return 'massa';

    const steps: ProductionStep[] = [
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
    ];
    const currentIndex = steps.indexOf(etapa);
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  }
}



