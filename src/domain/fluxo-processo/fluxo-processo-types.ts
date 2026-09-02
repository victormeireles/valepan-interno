import type { FluxoControleDia } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoFilasDia } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoEtapaRitmo } from '@/domain/fluxo-processo/fluxo-etapa-ritmo';
import type { FluxoProdutividadeMeta } from '@/domain/fluxo-processo/fluxo-produtividade-capacidade';
import type { JanelaOperacional } from '@/domain/producao-turno/janela-operacional';
import type { ProducaoTurnoNumero } from '@/domain/producao-turno/producao-turno-types';

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

/** Lançamento único acima do limite operacional da etapa (> 40 LT ferm/forno ou > 55 CX emb). */
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
  /** Volume operacional do dia (LT em ferm/forno, CX em emb). */
  volOperacional: number;
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
  /** Embalagem de OP anterior, em caixas. */
  volOperacional: number;
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
  /** Taxas de metas_mensais_produtividade do mês do dia; null se indisponível. */
  produtividade: FluxoProdutividadeMeta | null;
  /** Ritmo nativo (LT/h ferm/forno, CX/h emb) vs ontem e D-7. */
  ritmoPorEtapa: Record<FluxoEtapaKey, FluxoEtapaRitmo> | null;
  /** Preenchido pelo service após o builder (realizado-only). */
  controle: FluxoControleDia | null;
  /** Filas WIP (a produzir / fermentando / resfriando / embalado / perdas); null se não há OPs do dia. */
  filas: FluxoFilasDia | null;
  /** Janela T1 de cada etapa; preenchido pelo service após o builder. */
  janelasPorEtapa?: Record<FluxoEtapaKey, JanelaOperacional>;
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
  /** Presente em ferm/forno; embalagem envia quando o lote tem `pedidoEmbalagemId` (filas casam por OP). */
  ordemProducaoId?: string;
  turno?: ProducaoTurnoNumero | null;
  loteId?: string;
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
  padrao?: { camaraMin: number; resfrioMin: number };
  /** Cores cadastradas por nome de assadeira (#RRGGBB). */
  coresByNome?: Record<string, string>;
};

export type CargaFluxoProcessoResponse = {
  date: string;
  ultimaDataComDados: string | null;
  fluxo: VpFluxoPayload;
};
