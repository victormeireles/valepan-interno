// Tipos compartilhados para as telas de Realizado (Embalagem, Fermentação, Forno)

export type ProductionStatus = 'not-started' | 'partial' | 'complete';

export interface RealizadoItemBase {
  produto: string;
  unidade: string;
  aProduzir: number;
  produzido: number;
  dataProducao?: string;
  rowId?: number;
}

export interface RealizadoItemEmbalagem extends RealizadoItemBase {
  cliente: string;
  congelado: 'Sim' | 'Não';
  observacao: string;
  dataFabricacao?: string;
  sourceType?: 'pedido' | 'producao';
  // Valores individuais
  caixas?: number;
  pacotes?: number;
  unidades?: number;
  kg?: number;
  // Fotos
  pacoteFotoUrl?: string;
  etiquetaFotoUrl?: string;
  palletFotoUrl?: string;
}

export interface RealizadoItemFermentacao extends RealizadoItemBase {
  latas?: number;
  unidades?: number;
  kg?: number;
  fermentacaoFotoUrl?: string;
}

export interface RealizadoItemForno extends RealizadoItemBase {
  latas?: number;
  unidades?: number;
  kg?: number;
  fornoFotoUrl?: string;
}

export type RealizadoItem = RealizadoItemEmbalagem | RealizadoItemFermentacao | RealizadoItemForno;

export interface RealizadoGroup {
  key: string;
  cliente?: string;
  dataFabricacao?: string;
  observacao?: string;
  items: RealizadoItem[];
}

export function getProductionStatus(produzido: number, aProduzir: number): ProductionStatus {
  if (produzido === 0) return 'not-started';
  if (produzido < aProduzir) return 'partial';
  return 'complete';
}

export function getStatusColor(status: ProductionStatus): string {
  switch (status) {
    case 'not-started':
      return 'bg-red-500';
    case 'partial':
      return 'bg-yellow-500';
    case 'complete':
      return 'bg-green-500';
  }
}

