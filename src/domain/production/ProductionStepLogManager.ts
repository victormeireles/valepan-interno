/**
 * Manager para lógica de negócio de logs de etapas de produção
 * Responsabilidade: Validações, regras de negócio e coordenação entre repositórios
 */

import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import {
  ProductionStepLog,
  CreateProductionStepLogInput,
  UpdateProductionStepLogInput,
} from '@/domain/types/producao-etapas';

export class ProductionStepLogManager {
  constructor(
    private readonly stepRepository: ProductionStepRepository,
    private readonly orderRepository: ProductionOrderRepository,
  ) {}

  /**
   * Inicia uma nova etapa de produção
   */
  async startStep(input: CreateProductionStepLogInput): Promise<ProductionStepLog> {
    // Valida que a ordem de produção existe
    const order = await this.orderRepository.findById(input.ordem_producao_id);
    if (!order) {
      throw new Error('Ordem de produção não encontrada');
    }

    // Verifica se já existe uma etapa em andamento
    const logs = await this.stepRepository.findByOrderId(input.ordem_producao_id);
    const etapaEmAndamento = logs.find((log) => log.fim === null);
    
    if (etapaEmAndamento) {
      throw new Error(
        `Já existe uma etapa em andamento: ${etapaEmAndamento.etapa}. Finalize a etapa atual antes de iniciar uma nova.`,
      );
    }

    // Cria o log de etapa
    const log = await this.stepRepository.create(input);

    return log;
  }

  /**
   * Finaliza uma etapa de produção
   */
  async completeStep(
    logId: string,
    input: UpdateProductionStepLogInput,
  ): Promise<ProductionStepLog> {
    // Busca o log existente
    const log = await this.stepRepository.findById(logId);
    if (!log) {
      throw new Error('Log de etapa não encontrado');
    }

    // Verifica se já está finalizado
    if (log.fim !== null) {
      throw new Error('Esta etapa já foi finalizada');
    }

    // Atualiza o log com os dados finais e marca como finalizado
    const updateData: UpdateProductionStepLogInput = {
      ...input,
      fim: new Date().toISOString(),
    };

    const updatedLog = await this.stepRepository.update(logId, updateData);

    return updatedLog;
  }
}
