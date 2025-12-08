/**
 * Manager para lógica de negócio de logs de etapas de produção
 * Responsabilidade: Validações, regras de negócio e coordenação entre repositórios
 */

import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import {
  ProductionStep,
  CreateProductionStepLogInput,
  UpdateProductionStepLogInput,
  ProductionStepLog,
  QuantityValidationResult,
} from '@/domain/types/producao-etapas';

const MARGEM_ERRO_PERCENTUAL = 0.1; // 10% de margem de erro

export class ProductionStepLogManager {
  constructor(
    private readonly stepRepository: ProductionStepRepository,
    private readonly orderRepository: ProductionOrderRepository,
  ) {}

  /**
   * Inicia uma nova etapa de produção
   */
  async startStep(input: CreateProductionStepLogInput): Promise<ProductionStepLog> {
    // Valida que a ordem existe
    const order = await this.orderRepository.findById(input.ordem_producao_id);
    if (!order) {
      throw new Error('Ordem de produção não encontrada');
    }

    // Calcula qtd_entrada baseado na etapa anterior
    const qtdEntrada = await this.calculateQtdEntrada(
      input.ordem_producao_id,
      input.etapa,
    );

    // Cria o log
    const log = await this.stepRepository.create({
      ...input,
      qtd_entrada: qtdEntrada ?? undefined,
    });

    // Atualiza status da ordem
    await this.updateOrderStatus(input.ordem_producao_id, input.etapa);

    return log;
  }

  /**
   * Finaliza uma etapa de produção
   */
  async completeStep(
    logId: string,
    input: UpdateProductionStepLogInput,
  ): Promise<ProductionStepLog> {
    const currentLog = await this.stepRepository.findById(logId);
    if (!currentLog) {
      throw new Error('Log de etapa não encontrado');
    }

    // Valida quantidade se houver etapa anterior
    if (currentLog.qtd_entrada !== null && input.qtd_saida !== undefined) {
      const validation = this.validateQuantityBetweenSteps(
        currentLog.qtd_entrada,
        input.qtd_saida,
      );

      if (!validation.isValid) {
        throw new Error(validation.errorMessage || 'Quantidade inválida');
      }
    }

    // Atualiza o log com fim = agora
    const updatedLog = await this.stepRepository.update(logId, {
      ...input,
      fim: new Date().toISOString(),
    });

    // Se não for a última etapa, atualiza status da ordem para próxima etapa
    const nextStep = this.getNextStep(currentLog.etapa);
    if (nextStep) {
      await this.updateOrderStatus(currentLog.ordem_producao_id, nextStep);
    } else {
      // Última etapa concluída
      await this.orderRepository.update(currentLog.ordem_producao_id, {
        status: 'concluido',
      });
    }

    return updatedLog;
  }

  /**
   * Valida quantidade entre etapas (com margem de erro)
   */
  validateQuantityBetweenSteps(
    qtdEntrada: number,
    qtdSaida: number,
  ): QuantityValidationResult {
    const diferenca = qtdSaida - qtdEntrada;
    const percentualDiferenca = Math.abs(diferenca / qtdEntrada);

    // Se a saída for muito maior que a entrada (mais de 10%), alerta
    if (qtdSaida > qtdEntrada * (1 + MARGEM_ERRO_PERCENTUAL)) {
      return {
        isValid: false,
        errorMessage: `Quantidade de saída (${qtdSaida}) é ${(
          percentualDiferenca * 100
        ).toFixed(1)}% maior que a entrada (${qtdEntrada}). Verifique os dados.`,
      };
    }

    // Se a saída for muito menor que a entrada (mais de 10%), alerta mas permite
    if (qtdSaida < qtdEntrada * (1 - MARGEM_ERRO_PERCENTUAL)) {
      return {
        isValid: true,
        warningMessage: `Quantidade de saída (${qtdSaida}) é ${(
          percentualDiferenca * 100
        ).toFixed(1)}% menor que a entrada (${qtdEntrada}). Verifique se há perdas.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Calcula quantidade de entrada baseado na etapa anterior
   */
  private async calculateQtdEntrada(
    ordemProducaoId: string,
    etapa: ProductionStep,
  ): Promise<number | null> {
    if (etapa === 'massa') {
      // Massa não tem entrada (é a primeira etapa)
      return null;
    }

    const previousStep = this.getPreviousStep(etapa);
    if (!previousStep) {
      return null;
    }

    const lastLog = await this.stepRepository.findLastByOrderAndStep(
      ordemProducaoId,
      previousStep,
    );

    return lastLog?.qtd_saida || null;
  }

  /**
   * Atualiza status da ordem de produção
   */
  private async updateOrderStatus(
    ordemProducaoId: string,
    etapa: ProductionStep,
  ): Promise<void> {
    await this.orderRepository.update(ordemProducaoId, {
      status: etapa,
    });
  }

  /**
   * Retorna a próxima etapa após a atual
   */
  private getNextStep(etapa: ProductionStep): ProductionStep | null {
    const steps: ProductionStep[] = ['massa', 'fermentacao', 'forno', 'embalagem'];
    const currentIndex = steps.indexOf(etapa);
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  }

  /**
   * Retorna a etapa anterior à atual
   */
  private getPreviousStep(etapa: ProductionStep): ProductionStep | null {
    const steps: ProductionStep[] = ['massa', 'fermentacao', 'forno', 'embalagem'];
    const currentIndex = steps.indexOf(etapa);
    return currentIndex > 0 ? steps[currentIndex - 1] : null;
  }

  /**
   * Busca logs de uma ordem
   */
  async getLogsByOrderId(ordemProducaoId: string): Promise<ProductionStepLog[]> {
    return this.stepRepository.findByOrderId(ordemProducaoId);
  }

  /**
   * Busca log em andamento de uma ordem
   */
  async getInProgressLog(ordemProducaoId: string): Promise<ProductionStepLog | null> {
    const logs = await this.stepRepository.findInProgressByOrderId(ordemProducaoId);
    return logs.length > 0 ? logs[0] : null;
  }
}

