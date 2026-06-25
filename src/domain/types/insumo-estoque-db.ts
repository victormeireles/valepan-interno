import type { InsumoMovimentoOrigem, InsumoPendenciaStatus } from './insumo-estoque';

export type InsumoSaldoRow = {
  insumo_id: string;
  quantidade: number;
  updated_at: string;
};

export type InsumoMovimentoRow = {
  id: string;
  created_at: string;
  insumo_id: string;
  empresa_id: string | null;
  delta_quantidade: number;
  saldo_resultante: number;
  custo_unitario: number;
  origem: InsumoMovimentoOrigem;
  omie_n_id_receb: number | null;
  omie_n_id_item: number | null;
  omie_webhook_evento_id: string | null;
  pendencia_id: string | null;
  numero_nf: string | null;
  observacao: string | null;
};

export type IntegracaoInsumoRow = {
  id: string;
  empresa_id: string;
  omie_id_produto: number;
  omie_codigo_produto: string | null;
  insumo_id: string;
  fator_conversao: number;
  descricao_omie: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type InsumoEntradaPendenciaRow = {
  id: string;
  empresa_id: string;
  omie_webhook_evento_id: string | null;
  omie_n_id_receb: number;
  omie_n_id_item: number;
  omie_id_produto: number;
  omie_codigo_produto: string | null;
  descricao_produto: string | null;
  quantidade_nf: number;
  unidade_nf: string | null;
  preco_unit_nf: number | null;
  valor_total_item: number;
  numero_nf: string | null;
  data_emissao_nf: string | null;
  fornecedor_razao_social: string | null;
  fornecedor_nome: string | null;
  fornecedor_cnpj: string | null;
  natureza_operacao: string | null;
  valor_total_nf: number | null;
  cfop_entrada: string | null;
  ncm_produto: string | null;
  status: InsumoPendenciaStatus;
  integracao_insumo_id: string | null;
  resolvido_em: string | null;
  created_at: string;
};

export type RegistrarInsumoMovimentoInput = {
  insumoId: string;
  empresaId?: string | null;
  deltaQuantidade: number;
  saldoResultante: number;
  custoUnitario: number;
  origem: InsumoMovimentoOrigem;
  omieNIdReceb?: number | null;
  omieNIdItem?: number | null;
  omieWebhookEventoId?: string | null;
  pendenciaId?: string | null;
  numeroNf?: string | null;
  observacao?: string | null;
};

export type CriarIntegracaoInsumoInput = {
  empresaId: string;
  omieIdProduto: number;
  omieCodigoProduto: string | null;
  insumoId: string;
  fatorConversao: number;
  descricaoOmie?: string | null;
};

export type AtualizarEnriquecimentoPendenciaInput = {
  fornecedorRazaoSocial?: string | null;
  fornecedorNome?: string | null;
  fornecedorCnpj?: string | null;
  naturezaOperacao?: string | null;
  valorTotalNf?: number | null;
  cfopEntrada?: string | null;
  ncmProduto?: string | null;
  numeroNf?: string | null;
  dataEmissaoNf?: string | null;
};

export type RecebimentoPendenciaChave = {
  empresaId: string;
  omieNIdReceb: number;
};

export type CriarPendenciaInput = {
  empresaId: string;
  omieWebhookEventoId?: string | null;
  omieNIdReceb: number;
  omieNIdItem: number;
  omieIdProduto: number;
  omieCodigoProduto: string | null;
  descricaoProduto: string | null;
  quantidadeNf: number;
  unidadeNf: string | null;
  precoUnitNf: number | null;
  valorTotalItem: number;
  numeroNf: string | null;
  dataEmissaoNf: string | null;
  fornecedorRazaoSocial?: string | null;
  fornecedorNome?: string | null;
  fornecedorCnpj?: string | null;
  naturezaOperacao?: string | null;
  valorTotalNf?: number | null;
  cfopEntrada?: string | null;
  ncmProduto?: string | null;
};

export type InsumoPendenciaComEmpresa = InsumoEntradaPendenciaRow & {
  empresaNome: string;
};

export type IntegracaoInsumoComEmpresa = IntegracaoInsumoRow & {
  empresaNome: string;
};

export type IntegracaoInsumoListItem = IntegracaoInsumoRow & {
  empresaNome: string;
  insumoNome: string;
  insumoUnidadeCodigo: string | null;
  insumoUnidadeNome: string | null;
};
