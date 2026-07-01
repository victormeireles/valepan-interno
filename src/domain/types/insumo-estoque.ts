export type InsumoMovimentoOrigem =
  | 'entrada_nf'
  | 'ajuste_manual'
  | 'resolucao_pendencia'
  | 'producao_fermentacao'
  | 'producao_forno'
  | 'producao_embalagem';

export type InsumoConsumoResultado = {
  aplicado: boolean;
  avisos: string[];
};

export type InsumoPendenciaStatus = 'pendente' | 'resolvido' | 'ignorado';

export type OmieRecebimentoItem = {
  nIdItem: number;
  nIdProduto: number;
  cCodigoProduto: string;
  cDescricaoProduto: string;
  cUnidadeNfe: string;
  nQtdeNfe: number;
  nPrecoUnit: number;
  vTotalItem: number;
  cIgnorarItem: string;
  cfopEntrada: string | null;
  ncm: string | null;
  categoriaItem: string | null;
};

export type InsumoSaldoComDetalhes = {
  insumoId: string;
  nome: string;
  unidadeResumida: string;
  quantidade: number;
  custoUnitario: number;
  ultimaEntradaEm: string | null;
};

export type InsumoMovimentoRecord = {
  id: string;
  createdAt: string;
  insumoId: string;
  deltaQuantidade: number;
  saldoResultante: number;
  custoUnitario: number;
  origem: InsumoMovimentoOrigem;
  numeroNf: string | null;
  observacao: string | null;
};
