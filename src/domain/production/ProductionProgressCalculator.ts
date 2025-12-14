/**
 * Calculadora de progresso de produção
 * Responsabilidade: Calcular percentuais, receitas restantes e progresso geral
 */

import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import { ProductionMassaLoteRepository } from '@/data/production/ProductionMassaLoteRepository';
import {
  ProductionProgress,
  ProductionStep,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';
import { getQuantityByStation, ProductConversionInfo } from '@/lib/utils/production-conversions';

export class ProductionProgressCalculator {
  constructor(
    private readonly stepRepository: ProductionStepRepository,
    private readonly orderRepository: ProductionOrderRepository,
    private readonly massaLoteRepository?: ProductionMassaLoteRepository,
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
    const receitasBatidas = await this.calculateReceitasBatidas(logs, ordemProducaoId);

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
    const stepOrder: ProductionStep[] = ['massa', 'fermentacao', 'forno', 'embalagem'];
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
   * Calcula total de receitas batidas na etapa massa
   * Agora busca dos lotes de massa ao invés do JSONB
   */
  private async calculateReceitasBatidas(
    logs: ProductionStepLog[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ordemProducaoId: string,
  ): Promise<number> {
    // Se temos o repositório de lotes, busca dos lotes
    if (this.massaLoteRepository) {
      const massaLog = logs.find((log) => log.etapa === 'massa');
      if (massaLog) {
        const lotes = await this.massaLoteRepository.findByEtapasLogId(massaLog.id);
        return lotes.reduce((sum, lote) => sum + lote.receitas_batidas, 0);
      }
      return 0;
    }

    // Fallback: busca do JSONB (compatibilidade com dados antigos)
    const massaLogs = logs.filter(
      (log) => log.etapa === 'massa' && log.fim !== null,
    );

    let totalReceitas = 0;
    massaLogs.forEach((log) => {
      if (log.dados_qualidade && 'receitas_batidas' in log.dados_qualidade) {
        type DadosQualidadeComReceitas = Record<string, unknown> & { receitas_batidas?: number };
        const receitas = (log.dados_qualidade as DadosQualidadeComReceitas | null)?.receitas_batidas;
        if (typeof receitas === 'number') {
          totalReceitas += receitas;
        }
      }
    });

    return totalReceitas;
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
    // Se há log em andamento, retorna essa etapa
    const inProgress = logs.find((log) => log.fim === null);
    if (inProgress) {
      return inProgress.etapa;
    }

    // Caso contrário, usa o status da ordem
    const validSteps: ProductionStep[] = ['massa', 'fermentacao', 'forno', 'embalagem'];
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

    const steps: ProductionStep[] = ['massa', 'fermentacao', 'forno', 'embalagem'];
    const currentIndex = steps.indexOf(etapa);
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  }
}



