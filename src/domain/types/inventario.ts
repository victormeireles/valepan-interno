export interface Quantidade {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
}

export interface InventarioRecord {
  data: string;
  cliente: string;
  produto: string;
  quantidade: Quantidade;
  createdAt: string;
  updatedAt: string;
}

export interface EstoqueRecord {
  cliente: string;
  produto: string;
  quantidade: Quantidade;
  inventarioAtualizadoEm?: string;
  atualizadoEm: string;
}

export interface InventarioLancamentoItem {
  produto: string;
  quantidade: Quantidade;
}

export interface InventarioLancamentoPayload {
  data: string;
  cliente: string;
  itens: InventarioLancamentoItem[];
}

export interface EstoqueDiff {
  produto: string;
  anterior?: Quantidade;
  novo: Quantidade;
}


