/**
 * @deprecated Este repositório está deprecado.
 * Os dados de lotes de massa agora estão diretamente em producao_etapas_log.
 * Use ProductionStepRepository com etapa='massa' ao invés deste repositório.
 * 
 * Este arquivo é mantido temporariamente para compatibilidade durante a migração.
 * Será removido após confirmação de que não há mais dependências.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { MassaLote, CreateMassaLoteInput, UpdateMassaLoteInput } from '@/domain/types/producao-massa';

// Tipos temporários até os tipos do database serem atualizados
type MassaLoteRow = {
  id: string;
  producao_etapas_log_id: string;
  receita_id: string;
  masseira_id: string | null;
  receitas_batidas: number;
  temperatura_final: number | null;
  textura: 'ok' | 'rasga' | null;
  tempo_lenta: number | null;
  tempo_rapida: number | null;
  usuario_id: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type MassaLoteInsert = {
  producao_etapas_log_id: string;
  receita_id: string;
  masseira_id?: string | null;
  receitas_batidas: number;
  temperatura_final?: number | null;
  textura?: 'ok' | 'rasga' | null;
  tempo_lenta?: number | null;
  tempo_rapida?: number | null;
  usuario_id?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type MassaLoteUpdate = {
  receitas_batidas?: number;
  temperatura_final?: number | null;
  textura?: 'ok' | 'rasga' | null;
  tempo_lenta?: number | null;
  tempo_rapida?: number | null;
};

/**
 * @deprecated Use ProductionStepRepository ao invés deste repositório
 */
export class ProductionMassaLoteRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * @deprecated Este método não deve ser usado. Use ProductionStepRepository.create() com campos de massa.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(input: CreateMassaLoteInput): Promise<MassaLote> {
    throw new Error(
      'ProductionMassaLoteRepository.create() está deprecado. ' +
      'Use ProductionStepRepository para criar logs de etapa com campos de massa.'
    );
  }

  /**
   * @deprecated Este método não deve ser usado. Use ProductionStepRepository.update() com campos de massa.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(id: string, input: UpdateMassaLoteInput): Promise<MassaLote> {
    throw new Error(
      'ProductionMassaLoteRepository.update() está deprecado. ' +
      'Use ProductionStepRepository para atualizar logs de etapa com campos de massa.'
    );
  }

  /**
   * @deprecated Este método não deve ser usado. Use ProductionStepRepository.findByOrderId() e filtre por etapa='massa'.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findByEtapasLogId(etapasLogId: string): Promise<MassaLote[]> {
    throw new Error(
      'ProductionMassaLoteRepository.findByEtapasLogId() está deprecado. ' +
      'Use ProductionStepRepository.findById() para buscar logs de etapa.'
    );
  }

  /**
   * @deprecated Este método não deve ser usado. Use ProductionStepRepository.findById().
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findById(id: string): Promise<MassaLote | null> {
    throw new Error(
      'ProductionMassaLoteRepository.findById() está deprecado. ' +
      'Use ProductionStepRepository.findById() para buscar logs de etapa.'
    );
  }

  /**
   * @deprecated Este método não deve ser usado. Use ProductionStepRepository para atualizar ou deletar logs.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(id: string): Promise<void> {
    throw new Error(
      'ProductionMassaLoteRepository.delete() está deprecado. ' +
      'Use ProductionStepRepository para atualizar ou deletar logs de etapa.'
    );
  }

  /**
   * Mapeia uma row do banco para o tipo de domínio
   */
  private mapRowToDomain(row: MassaLoteRow): MassaLote {
    return {
      id: row.id,
      producao_etapas_log_id: row.producao_etapas_log_id,
      receita_id: row.receita_id,
      masseira_id: row.masseira_id,
      receitas_batidas: Number(row.receitas_batidas),
      temperatura_final: row.temperatura_final ? Number(row.temperatura_final) : null,
      textura: row.textura,
      tempo_lenta: row.tempo_lenta,
      tempo_rapida: row.tempo_rapida,
      usuario_id: row.usuario_id,
      created_at: row.created_at,
    };
  }
}
