export type FluxoEtapaKey = 'ferm' | 'forno' | 'emb';

export type FluxoGap = {
  ini: number;
  fim: number;
  dur: number;
};

export type FluxoBlocoProduto = {
  nome: string;
  un: number;
};

/** Rajada de lançamento retroativo (intervalos ≤ 1 min). */
export type FluxoBlocoLancamento = {
  ini: number;
  fim: number;
  eventos: number;
  un: number;
  produtos: FluxoBlocoProduto[];
};

export type FluxoEtapaResumo = {
  key: FluxoEtapaKey;
  nome: string;
  un: number;
  ini: number;
  fim: number;
  span: number;
  gaps: FluxoGap[];
  gapTot: number;
  ativo: number;
  eventos: number;
  blocoPct: number;
  /** Principais rajadas (ordenado por volume), para cobrança da equipe. */
  blocoLancamentos: FluxoBlocoLancamento[];
};

export type FluxoMatrizHoras = Record<string, number[]>;

export type FluxoMatrizEtapas = Record<FluxoEtapaKey, FluxoMatrizHoras>;

export type FluxoProdutoAssadeira = {
  nome: string;
  ferm: number;
  forno: number;
  emb: number;
  embAnt: number;
  /** Volume por hora (0–23) em cada etapa — para drill-down da célula. */
  fermHoras: number[];
  fornoHoras: number[];
  embHoras: number[];
};

export type FluxoAssadeiraResumo = {
  nome: string;
  ferm: number;
  forno: number;
  emb: number;
  embAnt: number;
  unPorLata: number;
  produtos: FluxoProdutoAssadeira[];
};

export type FluxoLeadStats = {
  media: number;
  mediana: number;
  p90: number;
  negativoUn: number;
  bins: number[];
};

export type FluxoOpAnterior = {
  un: number;
  eventos: number;
};

export type VpFluxoPayload = {
  dia: string;
  diaLabel: string;
  planoUn: number;
  etapas: FluxoEtapaResumo[];
  padrao: { camaraMin: number; resfrioMin: number };
  ordemAss: string[];
  cores: Record<string, string>;
  matriz: FluxoMatrizEtapas;
  matrizAnt: FluxoMatrizEtapas;
  assadeiras: FluxoAssadeiraResumo[];
  lead: {
    fermForno: FluxoLeadStats;
    fornoEmb: FluxoLeadStats;
  };
  opAnterior: FluxoOpAnterior;
  trocas: { forno: number };
};

export type FluxoApontamentoEvento = {
  produzidoEm: string;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  latas?: number;
  caixas?: number;
  /** Data da OP (YYYY-MM-DD). Embalagem usa para matrizAnt. */
  dataOp?: string;
};

export type FluxoOrdemFatorInput = {
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  latas: number;
  caixas: number;
};

export type FluxoBuilderInput = {
  dateISO: string;
  planoUn: number;
  ordensDia: FluxoOrdemFatorInput[];
  fermentacao: FluxoApontamentoEvento[];
  forno: FluxoApontamentoEvento[];
  embalagem: FluxoApontamentoEvento[];
};

export type CargaFluxoProcessoResponse = {
  date: string;
  ultimaDataComDados: string | null;
  fluxo: VpFluxoPayload;
};
