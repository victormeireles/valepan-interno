/**
 * Tipos de domínio para lotes de massa e ingredientes usados
 */

/**
 * Lote de massa produzido
 * @deprecated Esta interface está sendo deprecada. Os dados agora estão diretamente em ProductionStepLog.
 * Use ProductionStepLog com etapa='massa' ao invés desta interface.
 * Mantida temporariamente para compatibilidade durante a migração.
 */
export interface MassaLote {
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
  ingredientes?: MassaIngrediente[];
}

/**
 * Ingrediente usado em um lote de massa
 */
export interface MassaIngrediente {
  id: string;
  producao_etapas_log_id: string;
  insumo_id: string | null;
  quantidade_padrao: number;
  quantidade_usada: number;
  unidade: string;
  created_at: string;
}

/**
 * Dados para criar um novo lote de massa
 */
export interface CreateMassaLoteInput {
  producao_etapas_log_id: string;
  receita_id: string;
  masseira_id: string | null;
  receitas_batidas: number;
  temperatura_final: number;
  textura: 'ok' | 'rasga';
  tempo_lenta: number;
  tempo_rapida: number;
  usuario_id?: string;
  ingredientes: Array<{
    insumo_id: string;
    quantidade_padrao: number;
    quantidade_usada: number;
    unidade: string;
  }>;
}

/**
 * Dados para atualizar um lote de massa
 */
export interface UpdateMassaLoteInput {
  receitas_batidas?: number;
  temperatura_final?: number;
  textura?: 'ok' | 'rasga';
  tempo_lenta?: number;
  tempo_rapida?: number;
  ingredientes?: Array<{
    insumo_id: string;
    quantidade_padrao: number;
    quantidade_usada: number;
    unidade: string;
  }>;
}

