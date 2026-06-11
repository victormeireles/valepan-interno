export interface SaidaQuantidade {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
}

export interface SaidaSheetRecord {
  id: string;
  data: string;
  cliente: string;
  observacao: string;
  produto: string;
  meta: SaidaQuantidade;
  realizado: SaidaQuantidade;
  createdAt: string;
  updatedAt: string;
  saidaUpdatedAt?: string;
  fotoUrl?: string;
  fotoId?: string;
}

export interface SaidaMetaListItem {
  id: string;
  data: string;
  cliente: string;
  observacao: string;
  produto: string;
  meta: SaidaQuantidade;
}

export interface SaidaRealizadoListItem extends SaidaMetaListItem {
  realizado: SaidaQuantidade;
  fotoUrl?: string;
  fotoId?: string;
  saidaUpdatedAt?: string;
}

export interface SaidaMetaPayload {
  data: string;
  cliente: string;
  observacao?: string;
  produto: string;
  meta: SaidaQuantidade;
}

export interface SaidaSubmitItem {
  produto: string;
  meta: SaidaQuantidade;
}

export interface SaidaSubmitPayload {
  data: string;
  cliente: string;
  observacao?: string;
  itens: SaidaSubmitItem[];
}

export interface SaidaRealizadoPayload {
  id: string;
  realizado: SaidaQuantidade;
}

export interface NovaSaidaPayload {
  data: string;
  cliente: string;
  produto: string;
  meta: SaidaQuantidade;
  observacao?: string;
  skipNotification?: boolean;
  fotoUrl?: string;
  fotoId?: string;
}


