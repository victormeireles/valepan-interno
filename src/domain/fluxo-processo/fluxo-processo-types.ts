export type FluxoEtapaKey = 'ferm' | 'forno' | 'emb';

export type FluxoGap = {
  ini: number;
  fim: number;
  dur: number;
};

export type FluxoBlocoProduto = {
  nome: string;
  un: number;
  assadeiraNome: string;
};

/** Lançamento único acima do limite operacional da etapa (> 40 LT ferm, > 20 LT forno ou > 55 CX emb). */
export type FluxoBlocoLancamento = {
  ini: number;
  fim: number;
  eventos: number;
  un: number;
  assadeiraNome: string;
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
  /** Principais lançamentos acima do limite (ordenado por volume). */
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
  /** Ondas FIFO (OP + produto) fermentação → forno → embalagem. */
  ondas: FluxoOndaAssadeira[];
};

export type FluxoOndaProduto = {
  nome: string;
  un: number;
};

/** Trecho contínuo de horas com volume (gaps viram espaço vazio no trilho). */
export type FluxoOndaSegmento = {
  ini: number;
  fim: number;
  volumeUn: number;
};

/** Bloco contínuo de fermentação casado por FIFO até forno/emb. */
export type FluxoOndaAssadeira = {
  id: string;
  opKey: string;
  opLabel: string;
  /** Volume fermentado no bloco. */
  volumeUn: number;
  /** Volume casado no forno (janela da onda). */
  volumeFornoUn: number;
  /** Volume casado na embalagem (janela da onda). */
  volumeEmbUn: number;
  fermIniHora: number;
  fermFimHora: number;
  /** Envelope forno (1º–último segmento); null se sem casamento. */
  fornoIniHora: number | null;
  fornoFimHora: number | null;
  embIniHora: number | null;
  embFimHora: number | null;
  /** Segmentos contínuos dentro da janela (ex.: emb 06 + 09–11). */
  fornoSegmentos: FluxoOndaSegmento[];
  embSegmentos: FluxoOndaSegmento[];
  lagFermFornoMedMin: number | null;
  lagFornoEmbMedMin: number | null;
  embOpAnterior: boolean;
  produtos: FluxoOndaProduto[];
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
  /**
   * un/caixa por produto com OP que tem caixas.
   * Produtos ausentes não entram no modo CX.
   */
  unPorCaixaByProduto: Record<string, number>;
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
