import type { EstimativaProducaoHorarios } from '@/domain/estimativa-producao/estimativa-producao-types';
import type { FluxoEtapaKey, FluxoMatrizEtapas } from '@/domain/fluxo-processo/fluxo-processo-types';
import type {
  FluxoCapacidadeContext,
  FluxoProdutividadeMeta,
} from '@/domain/fluxo-processo/fluxo-produtividade-capacidade';

export type FluxoControleOpInput = EstimativaProducaoHorarios & {
  id: string;
  ordemPlanejamento: number;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  /** Assadeiras (LT) planejadas — usadas em ferm/forno no controle. */
  assadeiras: number;
  /** Caixas planejadas — usadas em emb no controle. */
  caixas: number;
  /** Travada ao finalizar a etapa; se ausente, o volume cai para a OP. */
  fermentacaoMetaConfirmada?: number | null;
  fornoMetaConfirmada?: number | null;
  embalagemMetaConfirmada?: number | null;
};

export type FluxoControleEventoInput = {
  ordemProducaoId?: string;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  produzidoEm: string;
  dataOp: string;
};

export type FluxoControleStatusBand = 'atrasado' | 'adiantado' | 'no plano';

export type FluxoControleEtapaNumeros = {
  objetivoUn: number;
  deveriaUn: number;
  estaUn: number;
  deltaUn: number;
  status: FluxoControleStatusBand;
  /** Assadeiras previstas — mesma unidade do topo da planilha. */
  objetivoLt: number;
  deveriaLt: number;
  /** Caixas previstas — modo CX. */
  objetivoCx: number;
  deveriaCx: number;
};

export type FluxoOpRelogioStatus =
  | 'sem_lancamento'
  | 'atrasada'
  | 'adiantada'
  | 'ok'
  | 'em_andamento';

export type FluxoOpRelogioItem = {
  ordemProducaoId: string;
  ordemPlanejamento: number;
  produtoNome: string;
  previstoFimIso: string;
  realizadoFimIso: string | null;
  deltaMin: number | null;
  status: FluxoOpRelogioStatus;
};

export type FluxoControleDia = {
  disponivel: boolean;
  etapas: Record<FluxoEtapaKey, FluxoControleEtapaNumeros>;
  matrizPrevisto: FluxoMatrizEtapas;
  relogio: Record<FluxoEtapaKey, FluxoOpRelogioItem[]>;
  embalagemFifo: boolean;
};

export type FluxoControleBuilderInput = {
  dateISO: string;
  todayISO: string;
  asOfMs: number;
  ops: FluxoControleOpInput[];
  /** Volume realizado no dia, na unidade nativa da etapa (LT / LT / CX). */
  etapasVol: Record<FluxoEtapaKey, number>;
  /** Embalagem de OP anterior, em caixas. */
  opAnteriorVol: number;
  ordemAss: string[];
  eventos: Record<FluxoEtapaKey, FluxoControleEventoInput[]>;
  gapTotMin: Record<FluxoEtapaKey, number>;
  ativoMin: Record<FluxoEtapaKey, number>;
  produtividade: FluxoProdutividadeMeta | null;
  capacidadeContext: FluxoCapacidadeContext;
};
