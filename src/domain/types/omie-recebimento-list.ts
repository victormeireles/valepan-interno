export const OMIE_ETAPA_RECEBIMENTO_CONCLUIDO = '60';

export type OmieRecebimentoCabecalhoResumo = {
  nIdReceb: number;
  cEtapa?: string;
  dEmissaoNFe?: string;
  cNumeroNFe?: string;
};

export type OmieListarRecebimentosFiltro = {
  nPagina: number;
  nRegistrosPorPagina: number;
  dtEmissaoDe?: string;
  dtEmissaoAte?: string;
  dtAltDe?: string;
  dtAltAte?: string;
  cEtapa?: string;
  cExibirDetalhes?: 'S' | 'N';
};

export type InsumoRecebimentoBackfillCriterioData = 'recebimento' | 'emissao';

export type OmieListarRecebimentosResponse = {
  nPagina: number;
  nTotalPaginas: number;
  nRegistros: number;
  nTotalRegistros: number;
  recebimentos?: Array<{ cabec?: OmieRecebimentoCabecalhoResumo } & OmieRecebimentoCabecalhoResumo>;
};
