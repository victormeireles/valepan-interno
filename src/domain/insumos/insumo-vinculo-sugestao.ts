export type InsumoVinculoAcaoSugerida = 'vincular' | 'ignorar' | 'revisar';

export type InsumoVinculoSugestaoFonte =
  | 'mapeamento_existente'
  | 'fuzzy'
  | 'keyword_ignorar'
  | 'ia'
  | 'nenhuma';

export type InsumoVinculoGrupoChave = {
  empresaId: string;
  omieIdProduto: number;
};

export type InsumoVinculoSugestaoDetalhe = {
  acao: InsumoVinculoAcaoSugerida;
  insumoId: string | null;
  insumoNome: string | null;
  fatorConversao: number | null;
  confianca: number;
  motivo: string;
  fonte: InsumoVinculoSugestaoFonte;
};

export type InsumoVinculoSugestaoGrupo = {
  chave: InsumoVinculoGrupoChave;
  empresaNome: string;
  descricaoOmie: string;
  omieCodigoProduto: string | null;
  unidadeNf: string | null;
  fornecedorRazaoSocial: string | null;
  fornecedorNome: string | null;
  cfopEntrada: string | null;
  pendenciaIds: string[];
  pendenciaCount: number;
  sugestao: InsumoVinculoSugestaoDetalhe;
};

export type InsumoVinculoSugestaoResumo = {
  vincular: number;
  ignorar: number;
  revisar: number;
  semSugestao: number;
};

export type InsumoVinculoSugestaoResultado = {
  grupos: InsumoVinculoSugestaoGrupo[];
  resumo: InsumoVinculoSugestaoResumo;
  produtosUnicos: number;
  pendenciasAfetadas: number;
};

export type InsumoVinculoLoteItem = {
  empresaId: string;
  omieIdProduto: number;
  acao: 'vincular' | 'ignorar';
  insumoId?: string;
  fatorConversao?: number;
  pendenciaIds: string[];
};

export type InsumoVinculoLoteResultado = {
  aplicados: number;
  pendenciasResolvidas: number;
  erros: Array<{ omieIdProduto: number; mensagem: string }>;
};

export type InsumoCatalogoItem = {
  id: string;
  nome: string;
  unidadeCodigo: string;
  unidadeNome: string;
  custoUnitario: number;
};
