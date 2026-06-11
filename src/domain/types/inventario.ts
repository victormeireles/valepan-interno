export interface Quantidade {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
}

export interface EstoqueRecord {
  cliente: string;
  produto: string;
  quantidade: Quantidade;
  inventarioAtualizadoEm?: string;
  atualizadoEm: string;
  tipoEstoqueId?: string;
  produtoId?: string;
  produtoFamiliaId?: string | null;
  produtoFamiliaNome?: string | null;
  produtoFamiliaImagemUrl?: string | null;
  ordemFamilia?: number;
  ordemNaFamilia?: number;
}
