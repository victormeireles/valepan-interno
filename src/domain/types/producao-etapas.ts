/**
 * Tipos de domínio para o sistema de etapas de produção
 */

export type ProductionStep = 'massa' | 'fermentacao' | 'forno' | 'embalagem';

export type ProductionOrderStatus =
  | 'planejado'
  | 'massa'
  | 'fermentacao'
  | 'forno'
  | 'embalagem'
  | 'concluido'
  | 'cancelado';

export type ProductionPriority = 0 | 1 | 2; // 0=Normal, 1=Alta, 2=Urgente

/**
 * Dados de qualidade específicos da etapa Massa
 */
export interface MassaQualityData {
  temp_final: number;
  textura: 'ok' | 'rasga';
  tempo_lenta?: number;
  tempo_rapida?: number;
  receitas_batidas: number;
  observacoes?: string;
  ingredientes_usados?: Array<{
    ingrediente_id: string;
    ingrediente_nome: string;
    quantidade_padrao: number;
    quantidade_usada: number;
    unidade: string;
  }>;
}

/**
 * Dados de qualidade específicos da etapa Fermentação
 */
export interface FermentacaoQualityData {
  tempo_decorrido?: number;
  observacoes?: string;
}

/**
 * Dados de qualidade específicos da etapa Forno
 */
export interface FornoQualityData {
  temp_forno?: number;
  tempo_assamento?: number;
  observacoes?: string;
}

/**
 * Dados de qualidade específicos da etapa Embalagem
 */
export interface EmbalagemQualityData {
  caixas?: number;
  assadeiras?: number;
  unidades?: number;
  observacoes?: string;
}

/**
 * Union type para dados de qualidade de qualquer etapa
 */
export type QualityData =
  | MassaQualityData
  | FermentacaoQualityData
  | FornoQualityData
  | EmbalagemQualityData;

/**
 * Registro de log de uma etapa de produção
 */
export interface ProductionStepLog {
  id: string;
  ordem_producao_id: string;
  etapa: ProductionStep;
  usuario_id: string | null;
  masseira_id: string | null;
  qtd_entrada: number | null;
  qtd_saida: number | null;
  perda_qtd: number;
  dados_qualidade: QualityData | null;
  fotos: string[];
  inicio: string;
  fim: string | null;
  // Campos específicos da etapa massa (opcionais, obrigatórios quando etapa='massa')
  receita_id?: string | null;
  receitas_batidas?: number | null;
  temperatura_final?: number | null;
  tempo_lenta?: number | null;
  tempo_rapida?: number | null;
  textura?: 'ok' | 'rasga' | null;
}

/**
 * Dados para criar um novo log de etapa
 */
export interface CreateProductionStepLogInput {
  ordem_producao_id: string;
  etapa: ProductionStep;
  usuario_id?: string;
  qtd_entrada?: number;
  qtd_saida: number;
  perda_qtd?: number;
  dados_qualidade?: QualityData;
  fotos?: string[];
  // Campos específicos da etapa massa (opcionais, obrigatórios quando etapa='massa')
  receita_id?: string | null;
  masseira_id?: string | null;
  receitas_batidas?: number | null;
  temperatura_final?: number | null;
  tempo_lenta?: number | null;
  tempo_rapida?: number | null;
  textura?: 'ok' | 'rasga' | null;
}

/**
 * Dados para atualizar um log de etapa existente
 */
export interface UpdateProductionStepLogInput {
  qtd_saida?: number;
  perda_qtd?: number;
  dados_qualidade?: QualityData;
  fotos?: string[];
  fim?: string | null;
  // Campos específicos da etapa massa (opcionais)
  receita_id?: string | null;
  masseira_id?: string | null;
  receitas_batidas?: number | null;
  temperatura_final?: number | null;
  tempo_lenta?: number | null;
  tempo_rapida?: number | null;
  textura?: 'ok' | 'rasga' | null;
}

/**
 * Informações de progresso de uma ordem de produção
 */
export interface ProductionProgress {
  ordem_producao_id: string;
  qtd_planejada: number;
  qtd_produzida: number;
  percentual_completo: number;
  receitas_batidas: number;
  receitas_necessarias: number;
  receitas_restantes: number;
  etapa_atual: ProductionStep | null;
  proxima_etapa: ProductionStep | null;
}

/**
 * Resultado de validação de quantidade entre etapas
 */
export interface QuantityValidationResult {
  isValid: boolean;
  errorMessage?: string;
  warningMessage?: string;
}



