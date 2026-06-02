import type { EtapaFilaSyncPreRequisitos } from '@/lib/production/producao-fila-sync-chain';
import { etapaAnteriorParaCarrinhos } from '@/lib/production/producao-fila-sync-chain';

/**
 * Origem de um adiantamento: a etapa onde o volume está parado hoje. «inicio» = massa pronta, ainda
 * não fermentado. As demais são etapas do pipeline com saldo parado (registrado mas não avançado).
 */
export type OrigemAdiantamento = 'inicio' | 'fermentacao' | 'entrada_forno' | 'saida_forno';

/** Etapas que recebem carrinhos sintéticos ao adiantar (massa é tratada à parte). */
export type EtapaPreenchivel = 'fermentacao' | 'entrada_forno' | 'saida_forno' | 'entrada_embalagem';

/** Pipeline linear usado para comparar posições (índice). */
const PIPELINE = [
  'inicio',
  'fermentacao',
  'entrada_forno',
  'saida_forno',
  'entrada_embalagem',
] as const;

type EtapaPipeline = (typeof PIPELINE)[number];

export function indicePipeline(etapa: string): number {
  return PIPELINE.indexOf(etapa as EtapaPipeline);
}

/** Volumes (LT) já registrados por etapa + meta da fermentação (= meta da OP em LT). */
export interface VolumesEtapasAdiantar {
  /** Meta total da ordem em LT (meta da fermentação). */
  metaLt: number;
  fermentacao: number;
  entradaForno: number;
  saidaForno: number;
  entradaEmbalagem: number;
}

export interface OrigemDisponivel {
  origem: OrigemAdiantamento;
  /** Saldo parado (LT) disponível para adiantar a partir desta origem. */
  saldo: number;
}

export const ROTULO_ORIGEM: Record<OrigemAdiantamento, string> = {
  inicio: 'Início (massa pronta)',
  fermentacao: 'Fermentação',
  entrada_forno: 'Entrada do forno',
  saida_forno: 'Saída do forno',
};

function naoNegativo(n: number): number {
  const v = Math.round(Number(n) || 0);
  return v > 0 ? v : 0;
}

/** Saldo parado por origem = volume na etapa − volume já avançado para a próxima. */
export function saldoPorOrigem(v: VolumesEtapasAdiantar): Record<OrigemAdiantamento, number> {
  return {
    inicio: naoNegativo(v.metaLt - v.fermentacao),
    fermentacao: naoNegativo(v.fermentacao - v.entradaForno),
    entrada_forno: naoNegativo(v.entradaForno - v.saidaForno),
    saida_forno: naoNegativo(v.saidaForno - v.entradaEmbalagem),
  };
}

/**
 * Origens válidas para adiantar até a etapa atual da fila: precisam estar ANTES da etapa-fonte de
 * carrinhos (`etapaAnteriorParaCarrinhos`) e ter saldo > 0.
 */
export function origensDisponiveis(
  v: VolumesEtapasAdiantar,
  etapaFila: EtapaFilaSyncPreRequisitos,
): OrigemDisponivel[] {
  const cartStage = etapaAnteriorParaCarrinhos(etapaFila);
  if (cartStage == null) return []; // fermentação: cadastro manual de carrinhos
  const cartIdx = indicePipeline(cartStage);
  const saldos = saldoPorOrigem(v);
  const out: OrigemDisponivel[] = [];
  for (const origem of ['inicio', 'fermentacao', 'entrada_forno', 'saida_forno'] as const) {
    if (indicePipeline(origem) >= cartIdx) continue; // origem já está na (ou depois da) etapa-fonte
    const saldo = saldos[origem];
    if (saldo > 0) out.push({ origem, saldo });
  }
  return out;
}

/**
 * Etapas preenchidas ao adiantar a partir de `origem` até a etapa da fila: as etapas estritamente
 * depois da origem e até (inclusive) a etapa-fonte de carrinhos.
 */
export function etapasPreenchidasPorOrigem(
  origem: OrigemAdiantamento,
  etapaFila: EtapaFilaSyncPreRequisitos,
): EtapaPreenchivel[] {
  const cartStage = etapaAnteriorParaCarrinhos(etapaFila);
  if (cartStage == null) return [];
  const origemIdx = indicePipeline(origem);
  const cartIdx = indicePipeline(cartStage);
  const out: EtapaPreenchivel[] = [];
  for (const etapa of ['fermentacao', 'entrada_forno', 'saida_forno', 'entrada_embalagem'] as const) {
    const idx = indicePipeline(etapa);
    if (idx > origemIdx && idx <= cartIdx) out.push(etapa);
  }
  return out;
}

export interface AdiantamentoQtd {
  origem: OrigemAdiantamento;
  latas: number;
}

/**
 * Delta (LT) que cada etapa preenchível recebe, somando todas as origens informadas.
 * Uma etapa recebe o volume de toda origem ANTES dela (e até a etapa-fonte).
 */
export function deltasPorEtapa(
  adiantamentos: AdiantamentoQtd[],
  etapaFila: EtapaFilaSyncPreRequisitos,
): Record<EtapaPreenchivel, number> {
  const base: Record<EtapaPreenchivel, number> = {
    fermentacao: 0,
    entrada_forno: 0,
    saida_forno: 0,
    entrada_embalagem: 0,
  };
  for (const a of adiantamentos) {
    if (a.latas <= 0) continue;
    for (const etapa of etapasPreenchidasPorOrigem(a.origem, etapaFila)) {
      base[etapa] += a.latas;
    }
  }
  return base;
}
