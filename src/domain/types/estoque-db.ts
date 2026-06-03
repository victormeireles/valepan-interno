import type { Quantidade } from './inventario';

export type EstoqueMovimentoOrigem =
  | 'embalagem'
  | 'saida'
  | 'inventario'
  | 'ajuste_manual';

export interface EstoqueSaldoRecord {
  id: string;
  tipoEstoqueId: string;
  tipoEstoqueNome: string;
  produtoId: string;
  produtoNome: string;
  quantidade: Quantidade;
  updatedAt: string;
}

export interface EstoqueMovimentoRecord {
  id: string;
  createdAt: string;
  tipoEstoqueId: string;
  tipoEstoqueNome: string;
  produtoId: string;
  produtoNome: string;
  delta: Quantidade;
  saldo: Quantidade;
  origem: EstoqueMovimentoOrigem;
}

export interface RegistrarMovimentoInput {
  tipoEstoqueId: string;
  produtoId: string;
  delta: Quantidade;
  saldo: Quantidade;
  origem: EstoqueMovimentoOrigem;
}

export interface ListMovimentosFilters {
  tipoEstoqueId?: string;
  produtoId?: string;
  origem?: EstoqueMovimentoOrigem;
  de?: string;
  ate?: string;
  limit?: number;
}
