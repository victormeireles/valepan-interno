export type OmieRecebimentoCabecEnriquecido = {
  cNumeroNF: string;
  dDataEmissao: string | null;
  fornecedorRazaoSocial: string | null;
  fornecedorNome: string | null;
  fornecedorCnpj: string | null;
  naturezaOperacao: string | null;
  valorTotalNf: number | null;
  chaveNfe: string | null;
};

export type OmieRecebimentoContextoNf = {
  numeroNf: string;
  dataEmissaoNf: string | null;
  fornecedorRazaoSocial: string | null;
  fornecedorNome: string | null;
  fornecedorCnpj: string | null;
  naturezaOperacao: string | null;
  valorTotalNf: number | null;
  chaveNfe: string | null;
};
