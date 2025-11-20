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
  // Resfriamento: foto única
  resfriamentoFotoUrl?: string;
  resfriamentoFotoId?: string;
  resfriamentoFotoUploadedAt?: string;
}

// Dados de produção com fotos
export interface ProducaoData extends PhotoData {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
  obsEmbalagem?: string;
}

// Tipo de foto para upload
export type PhotoType = 'pacote' | 'etiqueta' | 'pallet' | 'forno' | 'fermentacao' | 'resfriamento';

// Resposta da API de upload de foto
export interface PhotoUploadResponse {
  success: boolean;
  photoUrl: string;
  photoId: string;
  photoType: PhotoType;
  message: string;
}
