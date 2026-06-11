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
  produtoFamiliaId?: string | null;
  produtoFamiliaNome?: string | null;
  produtoFamiliaImagemUrl?: string | null;
  ordemFamilia?: number;
  ordemNaFamilia?: number;
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
  clienteDestino?: string | null;
}

export interface RegistrarMovimentoInput {
  tipoEstoqueId: string;
  produtoId: string;
  delta: Quantidade;
  saldo: Quantidade;
  origem: EstoqueMovimentoOrigem;
  embalagemLoteId?: string | null;
  clienteDestino?: string | null;
}

export interface ListMovimentosFilters {
  tipoEstoqueId?: string;
  produtoId?: string;
  origem?: EstoqueMovimentoOrigem;
  de?: string;
  ate?: string;
  limit?: number;
}

export interface ListSaldosOptions {
  apenasProdutosAtivos?: boolean;
}
