// Tipos base para todas as etapas
export interface BaseStageData {
  data: string; // formato YYYY-MM-DD
  turno: 1 | 2;
}

// Etapa 1: Pré-Mistura
export interface PreMisturaData extends BaseStageData {
  preMistura: string;
  quantidade: number; // pode ser 3, 3.5, etc.
}

// Etapa 2: Massa
export interface MassaData extends BaseStageData {
  massa: string;
  quantidade: number; // pode ser 3, 3.5, etc.
}

// Etapa 3: Fermentação
export interface FermentacaoData extends BaseStageData {
  fermentacao: string;
  carrinhos: number; // pode ser 3, 3.5, etc.
  assadeiras: number; // sempre inteiro
  unidades: number; // sempre inteiro
}

// Etapa 4: Resfriamento
export interface ResfriamentoData extends BaseStageData {
  produto: string;
  carrinhos: number; // pode ser 3, 3.5, etc.
  assadeiras: number; // sempre inteiro
  unidades: number; // sempre inteiro
}

// Etapa 5: Forno
export interface FornoData extends BaseStageData {
  produto: string;
  carrinhos: number; // pode ser 3, 3.5, etc.
  assadeiras: number; // sempre inteiro
  unidades: number; // sempre inteiro
}

// Etapa 6: Embalagem (produção)
export interface EmbalagemProducaoData extends BaseStageData {
  cliente: string;
  produto: string;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
}

// Union type para todas as etapas
export type StageData = 
  | PreMisturaData 
  | MassaData 
  | FermentacaoData 
  | ResfriamentoData 
  | FornoData
  | EmbalagemProducaoData;

// Tipos para as etapas
export type StageType = 'pre-mistura' | 'massa' | 'fermentacao' | 'resfriamento' | 'forno' | 'embalagem-producao';

// Resposta da API de opções
export interface OptionsResponse {
  options: string[];
}

// Resposta da API de submissão
export interface SubmitResponse {
  success: boolean;
  message: string;
  data?: StageData;
  timestamp: string;
}

// Erro da API
export interface ApiError {
  error: string;
  details?: string;
  email?: string;
  sheetUrl?: string;
}
