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


// Union type para todas as etapas
export type StageData = 
  | PreMisturaData 
  | MassaData 
  | FermentacaoData 
  | ResfriamentoData 
  | FornoData;

// Tipos para as etapas
export type StageType = 'pre-mistura' | 'massa' | 'fermentacao' | 'resfriamento' | 'forno' | 'producao-embalagem';

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

// Tipos para fotos de produção
export interface PhotoData {
  pacoteFotoUrl?: string;
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoUrl?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoUrl?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
  // Forno: foto única
  fornoFotoUrl?: string;
  fornoFotoId?: string;
  fornoFotoUploadedAt?: string;
  // Fermentacao: foto única
  fermentacaoFotoUrl?: string;
  fermentacaoFotoId?: string;
  fermentacaoFotoUploadedAt?: string;
}

// Dados de produção com fotos
export interface ProducaoData extends PhotoData {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
}

// Tipo de foto para upload
export type PhotoType = 'pacote' | 'etiqueta' | 'pallet' | 'forno' | 'fermentacao';

// Resposta da API de upload de foto
export interface PhotoUploadResponse {
  success: boolean;
  photoUrl: string;
  photoId: string;
  photoType: PhotoType;
  message: string;
}
