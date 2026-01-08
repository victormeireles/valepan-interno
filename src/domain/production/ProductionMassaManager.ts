/**
 * Manager para lógica de negócio de lotes de massa
 * Responsabilidade: Validações, cálculos e coordenação entre repositórios
 * 
 * Agora trabalha diretamente com ProductionStepLog ao invés de MassaLote
 */

import { ProductionMassaIngredienteRepository } from '@/data/production/ProductionMassaIngredienteRepository';
import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import {
  ProductionStepLog,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CreateProductionStepLogInput,
  UpdateProductionStepLogInput,
} from '@/domain/types/producao-etapas';
import {
  MassaLote,
  CreateMassaLoteInput,
  UpdateMassaLoteInput,
  MassaIngrediente,
} from '@/domain/types/producao-massa';

export class ProductionMassaManager {
  constructor(
    private readonly ingredienteRepository: ProductionMassaIngredienteRepository,
    private readonly stepRepository: ProductionStepRepository,
    private readonly orderRepository: ProductionOrderRepository,
  ) {}

  /**
   * Cria um novo lote de massa (agora cria diretamente em producao_etapas_log)
   */
  async createLote(input: CreateMassaLoteInput): Promise<MassaLote> {
    console.log('[ProductionMassaManager.createLote] 📝 Iniciando criação de lote...');
    
    // Valida que o log de etapa existe
    const log = await this.stepRepository.findById(input.producao_etapas_log_id);
    if (!log) {
      throw new Error('Log de etapa não encontrado');
    }

    if (log.etapa !== 'massa') {
      throw new Error('Log de etapa deve ser do tipo massa');
    }

    // Atualiza o log de etapa com os dados do lote de massa
    const updatedLog = await this.stepRepository.update(input.producao_etapas_log_id, {
      receita_id: input.receita_id,
      masseira_id: input.masseira_id,
      receitas_batidas: input.receitas_batidas,
      temperatura_final: input.temperatura_final,
      tempo_lenta: input.tempo_lenta,
      tempo_rapida: input.tempo_rapida,
      textura: input.textura,
    });

    console.log('[ProductionMassaManager.createLote] ✅ Lote atualizado no log:', { log_id: updatedLog.id });

    // Cria os ingredientes
    const ingredientesInsert = input.ingredientes.map((ing) => ({
      producao_etapas_log_id: input.producao_etapas_log_id,
      insumo_id: ing.insumo_id || null,
      quantidade_padrao: ing.quantidade_padrao,
      quantidade_usada: ing.quantidade_usada,
      unidade: ing.unidade,
    }));

    const ingredientes = await this.ingredienteRepository.createMany(ingredientesInsert);

    // Atualiza qtd_saida do log de etapa (soma de todos os lotes)
    console.log('[ProductionMassaManager.createLote] 🔄 Chamando updateEtapaLogQuantidade...');
    await this.updateEtapaLogQuantidade(log.ordem_producao_id);
    console.log('[ProductionMassaManager.createLote] ✅ updateEtapaLogQuantidade concluído');

    // Converte ProductionStepLog para MassaLote (compatibilidade)
    return this.mapStepLogToMassaLote(updatedLog, ingredientes);
  }

  /**
   * Atualiza um lote de massa (agora atualiza diretamente em producao_etapas_log)
   */
  async updateLote(etapasLogId: string, input: UpdateMassaLoteInput): Promise<MassaLote> {
    const log = await this.stepRepository.findById(etapasLogId);
    if (!log) {
      throw new Error('Log de etapa não encontrado');
    }

    if (log.etapa !== 'massa') {
      throw new Error('Log de etapa deve ser do tipo massa');
    }

    // Atualiza o log de etapa com os dados do lote de massa
    const updateData: UpdateProductionStepLogInput = {
      receitas_batidas: input.receitas_batidas,
      temperatura_final: input.temperatura_final,
      tempo_lenta: input.tempo_lenta,
      tempo_rapida: input.tempo_rapida,
      textura: input.textura,
    };

    const updatedLog = await this.stepRepository.update(etapasLogId, updateData);

    // Se houver ingredientes, atualiza
    if (input.ingredientes) {
      const ingredientesInsert = input.ingredientes.map((ing) => ({
        producao_etapas_log_id: etapasLogId,
        insumo_id: ing.insumo_id || null,
        quantidade_padrao: ing.quantidade_padrao,
        quantidade_usada: ing.quantidade_usada,
        unidade: ing.unidade,
      })) as Parameters<typeof this.ingredienteRepository.updateByLoteId>[1];

      await this.ingredienteRepository.updateByLoteId(etapasLogId, ingredientesInsert);
    }

    // Busca ingredientes atualizados
    const ingredientes = await this.ingredienteRepository.findByLoteId(etapasLogId);

    // Atualiza qtd_saida do log de etapa
    await this.updateEtapaLogQuantidade(log.ordem_producao_id);

    return this.mapStepLogToMassaLote(updatedLog, ingredientes);
  }

  /**
   * Busca todos os lotes de uma ordem de produção (agora busca logs de etapa massa)
   */
  async getLotesByOrderId(ordemProducaoId: string): Promise<MassaLote[]> {
    console.log('[ProductionMassaManager] Buscando lotes para ordem:', ordemProducaoId);
    
    // Busca todos os logs de etapa massa (não apenas o último)
    const logs = await this.stepRepository.findByOrderId(ordemProducaoId);
    const logsMassa = logs.filter(log => log.etapa === 'massa');
    
    console.log('[ProductionMassaManager] Logs de massa encontrados:', logsMassa.length);
    
    if (logsMassa.length === 0) {
      console.log('[ProductionMassaManager] Nenhum log de massa encontrado');
      return [];
    }

    // Busca ingredientes para cada log de massa e converte para MassaLote
    const todosLotes: MassaLote[] = [];
    for (const log of logsMassa) {
      console.log('[ProductionMassaManager] Buscando ingredientes para log:', log.id);
      const ingredientes = await this.ingredienteRepository.findByLoteId(log.id);
      console.log('[ProductionMassaManager] Ingredientes encontrados para log', log.id, ':', ingredientes.length);
      
      const lote = this.mapStepLogToMassaLote(log, ingredientes);
      todosLotes.push(lote);
    }

    console.log('[ProductionMassaManager] Total de lotes encontrados:', todosLotes.length);
    return todosLotes;
  }

  /**
   * Deleta um lote de massa (agora deleta o log de etapa)
   */
  async deleteLote(etapasLogId: string): Promise<void> {
    const log = await this.stepRepository.findById(etapasLogId);
    if (!log) {
      throw new Error('Log de etapa não encontrado');
    }

    if (log.etapa !== 'massa') {
      throw new Error('Log de etapa deve ser do tipo massa');
    }

    // Deleta ingredientes (cascade já faz isso, mas garantimos)
    await this.ingredienteRepository.deleteByLoteId(etapasLogId);

    // Deleta o log de etapa (que agora é o "lote")
    // Nota: Pode ser necessário apenas limpar os campos de massa ao invés de deletar
    // Por enquanto, vamos apenas limpar os campos de massa
    await this.stepRepository.update(etapasLogId, {
      receita_id: null,
      masseira_id: null,
      receitas_batidas: null,
      temperatura_final: null,
      tempo_lenta: null,
      tempo_rapida: null,
      textura: null,
    });

    // Atualiza qtd_saida do log de etapa
    await this.updateEtapaLogQuantidade(log.ordem_producao_id);
  }

  /**
   * Calcula quantidade total produzida somando todos os lotes
   */
  async calculateTotalProduced(ordemProducaoId: string): Promise<number> {
    const lotes = await this.getLotesByOrderId(ordemProducaoId);
    
    // Busca ordem para pegar quantidade_por_produto
    const order = await this.orderRepository.findById(ordemProducaoId);
    if (!order) {
      return 0;
    }

    // Soma receitas batidas
    const totalReceitas = lotes.reduce((sum, lote) => sum + (lote.receitas_batidas || 0), 0);

    // Busca quantidade_por_produto da receita
    // TODO: Isso precisa vir do produto_receitas, por enquanto retorna 0
    // Será calculado no manager que tem acesso ao produto
    return totalReceitas;
  }

  /**
   * Atualiza qtd_saida do log de etapa baseado na soma dos lotes
   */
  private async updateEtapaLogQuantidade(ordemProducaoId: string): Promise<void> {
    console.log('[ProductionMassaManager.updateEtapaLogQuantidade] 🔄 Iniciando atualização...', {
      ordemProducaoId,
    });
    
    // Busca todos os logs de etapa massa
    const logs = await this.stepRepository.findByOrderId(ordemProducaoId);
    const logsMassa = logs.filter(log => log.etapa === 'massa');
    
    if (logsMassa.length === 0) {
      console.log('[ProductionMassaManager.updateEtapaLogQuantidade] ⚠️ Nenhum log de massa encontrado');
      return;
    }

    // Soma receitas batidas de todos os logs de massa
    const totalReceitas = logsMassa.reduce((sum, log) => {
      return sum + (log.receitas_batidas || 0);
    }, 0);

    console.log('[ProductionMassaManager.updateEtapaLogQuantidade] 📊 Calculando total:', {
      total_logs: logsMassa.length,
      total_receitas: totalReceitas,
    });

    // Atualiza o último log de massa com o total
    const ultimoLog = logsMassa[logsMassa.length - 1];
    console.log('[ProductionMassaManager.updateEtapaLogQuantidade] 🔄 Chamando stepRepository.update...');
    await this.stepRepository.update(ultimoLog.id, {
      qtd_saida: totalReceitas,
    });
    console.log('[ProductionMassaManager.updateEtapaLogQuantidade] ✅ Atualização concluída');
  }

  /**
   * Converte ProductionStepLog para MassaLote (compatibilidade)
   */
  private mapStepLogToMassaLote(log: ProductionStepLog, ingredientes: MassaIngrediente[]): MassaLote {
    return {
      id: log.id,
      producao_etapas_log_id: log.id,
      receita_id: log.receita_id || '',
      masseira_id: log.masseira_id,
      receitas_batidas: log.receitas_batidas || 0,
      temperatura_final: log.temperatura_final || null,
      textura: log.textura || null,
      tempo_lenta: log.tempo_lenta || null,
      tempo_rapida: log.tempo_rapida || null,
      usuario_id: log.usuario_id,
      created_at: log.inicio,
      ingredientes,
    };
  }
}
