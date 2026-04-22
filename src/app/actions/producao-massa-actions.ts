'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import { ProductionMassaIngredienteRepository } from '@/data/production/ProductionMassaIngredienteRepository';
import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import { ProductionMassaManager } from '@/domain/production/ProductionMassaManager';
import { ProductionStepLogManager } from '@/domain/production/ProductionStepLogManager';
import { CreateMassaLoteInput, UpdateMassaLoteInput } from '@/domain/types/producao-massa';

/**
 * Cria um novo lote de massa
 */
export async function createMassaLote(input: CreateMassaLoteInput) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const ingredienteRepository = new ProductionMassaIngredienteRepository(supabase);
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const massaManager = new ProductionMassaManager(
    ingredienteRepository,
    stepRepository,
    orderRepository,
  );

  try {
    console.log('[createMassaLote] Iniciando criação de lote:', {
      producao_etapas_log_id: input.producao_etapas_log_id,
      receita_id: input.receita_id,
      receitas_batidas: input.receitas_batidas,
    });

    // Busca log de etapa para validar
    console.log('[createMassaLote] Buscando log de etapa...');
    const log = await stepRepository.findById(input.producao_etapas_log_id);
    if (!log) {
      console.error('[createMassaLote] Log de etapa não encontrado:', input.producao_etapas_log_id);
      throw new Error('Log de etapa não encontrado');
    }

    console.log('[createMassaLote] Log encontrado:', {
      log_id: log.id,
      ordem_producao_id: log.ordem_producao_id,
      etapa: log.etapa,
    });

    // Cria o lote (agora atualiza diretamente o log de etapa)
    console.log('[createMassaLote] ⚙️ Criando lote via manager...');
    const lote = await massaManager.createLote(input);
    console.log('[createMassaLote] ✅ Lote criado com sucesso:', { lote_id: lote.id });

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/massa`);

    return { success: true, data: lote };
  } catch (error) {
    console.error('[createMassaLote] Erro completo:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      input: {
        producao_etapas_log_id: input.producao_etapas_log_id,
        receita_id: input.receita_id,
        receitas_batidas: input.receitas_batidas,
      },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar lote de massa',
    };
  }
}

/**
 * Anexa URL de foto ao log do lote de massa (após upload em `/api/upload/producao-photo`).
 */
export async function appendFotoToMassaStepLog(etapasLogId: string, photoUrl: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const log = await stepRepository.findById(etapasLogId);
    if (!log) {
      return { success: false as const, error: 'Log de etapa não encontrado.' };
    }
    if (log.etapa !== 'massa') {
      return { success: false as const, error: 'Registro não é da etapa massa.' };
    }
    const prev = log.fotos ?? [];
    const merged = prev.includes(photoUrl) ? [...prev] : [...prev, photoUrl];
    await stepRepository.update(etapasLogId, { fotos: merged });

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/massa`);

    return { success: true as const };
  } catch (error) {
    console.error('[appendFotoToMassaStepLog]', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao anexar foto ao lote',
    };
  }
}

/**
 * Busca todos os lotes de uma ordem de produção
 */
export async function getMassaLotesByOrder(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const ingredienteRepository = new ProductionMassaIngredienteRepository(supabase);
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const massaManager = new ProductionMassaManager(
    ingredienteRepository,
    stepRepository,
    orderRepository,
  );

  try {
    const lotes = await massaManager.getLotesByOrderId(ordemProducaoId);
    return { success: true, data: lotes };
  } catch (error) {
    console.error('Erro ao buscar lotes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar lotes',
    };
  }
}

/**
 * Atualiza um lote de massa
 */
export async function updateMassaLote(etapasLogId: string, input: UpdateMassaLoteInput) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const ingredienteRepository = new ProductionMassaIngredienteRepository(supabase);
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const massaManager = new ProductionMassaManager(
    ingredienteRepository,
    stepRepository,
    orderRepository,
  );

  try {
    const log = await stepRepository.findById(etapasLogId);
    if (!log) {
      throw new Error('Log de etapa não encontrado');
    }

    // Atualiza o lote (agora atualiza diretamente o log de etapa)
    console.log('[updateMassaLote] ⚙️ Atualizando lote via manager...');
    const updatedLote = await massaManager.updateLote(etapasLogId, input);
    console.log('[updateMassaLote] ✅ Lote atualizado com sucesso');

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/massa`);

    return { success: true, data: updatedLote };
  } catch (error) {
    console.error('Erro ao atualizar lote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar lote',
    };
  }
}

/**
 * Deleta um lote de massa
 */
export async function deleteMassaLote(etapasLogId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const ingredienteRepository = new ProductionMassaIngredienteRepository(supabase);
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const massaManager = new ProductionMassaManager(
    ingredienteRepository,
    stepRepository,
    orderRepository,
  );

  try {
    const log = await stepRepository.findById(etapasLogId);
    if (!log) {
      throw new Error('Log de etapa não encontrado');
    }

    await massaManager.deleteLote(etapasLogId);

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/massa`);

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar lote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar lote',
    };
  }
}

/**
 * Inicia etapa massa (cria log se não existir)
 */
export async function ensureMassaStepLog(ordemProducaoId: string, usuarioId?: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  try {
    console.log('[ensureMassaStepLog] 🔍 Verificando log de etapa massa existente...', {
      ordem_producao_id: ordemProducaoId,
      usuario_id: usuarioId,
    });

    // Verifica se já existe log de massa em andamento
    const log = await stepRepository.findLastByOrderAndStep(ordemProducaoId, 'massa');
    console.log('[ensureMassaStepLog] Log encontrado:', {
      log_id: log?.id,
      tem_fim: !!log?.fim,
      log_completo: log ? {
        id: log.id,
        etapa: log.etapa,
        fim: log.fim,
        receita_id: log.receita_id,
        masseira_id: log.masseira_id,
      } : null,
    });

    if (log && !log.fim) {
      console.log('[ensureMassaStepLog] ✅ Log em andamento encontrado, retornando...');
      return { success: true, data: log };
    }

    // Cria novo log de etapa massa
    // Nota: Campos de massa são NULL na criação inicial, serão preenchidos quando um lote for criado
    const createInput = {
      ordem_producao_id: ordemProducaoId,
      etapa: 'massa' as const,
      usuario_id: usuarioId,
      qtd_saida: 0, // Será atualizado quando lotes forem criados
      // Campos de massa deixados como undefined (serão NULL no banco)
      // Eles serão preenchidos quando createMassaLote for chamado
    };

    console.log('[ensureMassaStepLog] 📝 Criando novo log de etapa massa...', {
      createInput: {
        ordem_producao_id: createInput.ordem_producao_id,
        etapa: createInput.etapa,
        usuario_id: createInput.usuario_id,
        qtd_saida: createInput.qtd_saida,
      },
    });

    const newLog = await stepManager.startStep(createInput);
    console.log('[ensureMassaStepLog] ✅ Log criado com sucesso:', {
      log_id: newLog.id,
      etapa: newLog.etapa,
      receita_id: newLog.receita_id,
      masseira_id: newLog.masseira_id,
    });

    return { success: true, data: newLog };
  } catch (error) {
    console.error('[ensureMassaStepLog] ❌ Erro ao garantir log de etapa massa:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ordem_producao_id: ordemProducaoId,
      usuario_id: usuarioId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao garantir log de etapa massa',
    };
  }
}

/**
 * Garante um log de etapa massa **novo** para registrar outro lote na mesma OP.
 * Se o último log de massa em aberto já tiver lote salvo (`receita_id`), fecha esse log
 * e cria um novo — evita sobrescrever o mesmo registro ao criar o 2º, 3º lote, etc.
 */
export async function ensureMassaStepLogForNewLote(ordemProducaoId: string, usuarioId?: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  try {
    const lastMassa = await stepRepository.findLastByOrderAndStep(ordemProducaoId, 'massa');
    if (lastMassa && !lastMassa.fim && lastMassa.receita_id) {
      await stepRepository.update(lastMassa.id, {
        fim: new Date().toISOString(),
      });
    }

    const log = await stepRepository.findLastByOrderAndStep(ordemProducaoId, 'massa');
    if (log && !log.fim) {
      return { success: true as const, data: log };
    }

    const newLog = await stepManager.startStep({
      ordem_producao_id: ordemProducaoId,
      etapa: 'massa',
      usuario_id: usuarioId,
      qtd_saida: 0,
    });

    return { success: true as const, data: newLog };
  } catch (error) {
    console.error('[ensureMassaStepLogForNewLote] Erro:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao preparar novo lote de massa',
    };
  }
}
