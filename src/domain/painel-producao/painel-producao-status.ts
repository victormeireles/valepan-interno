import { PAINEL_PRODUCAO_STAGES, PAINEL_PRODUCAO_STALL_MIN } from './painel-producao-constants';
import { formatDurationFromMinutes } from './painel-producao-time';
import type {
  PainelProducaoProduct,
  PainelProducaoStageView,
  PainelProducaoStatus,
} from './painel-producao-types';

function isStageDone(stage: PainelProducaoStageView): boolean {
  return stage.done >= stage.meta;
}

export function statusOfProduct(product: PainelProducaoProduct): PainelProducaoStatus {
  if (
    product.embalagemFinalizada ||
    (isStageDone(product.ferm) && isStageDone(product.forno) && isStageDone(product.emb))
  ) {
    return 'concluido';
  }
  if (product.ferm.done === 0 && !product.fermentacaoFinalizada) {
    return 'aguardando';
  }
  if (!product.fermentacaoFinalizada) {
    return 'fermentando';
  }
  if (!product.fornoFinalizada) {
    return 'forno';
  }
  return 'embalando';
}

export function tetoEmbalagem(product: PainelProducaoProduct): number {
  if (product.forno.meta <= 0) return 0;
  return Math.floor(product.forno.done * (product.emb.meta / product.forno.meta));
}

export function filaForno(product: PainelProducaoProduct): number {
  return Math.max(0, product.ferm.done - product.forno.done);
}

export function stallOfProduct(
  product: PainelProducaoProduct,
  agoraMin: number,
): { stage: 'ferm' | 'forno' | 'emb'; label: string } | null {
  const status = statusOfProduct(product);
  const stageKeyMap: Partial<Record<PainelProducaoStatus, 'ferm' | 'forno' | 'emb'>> = {
    fermentando: 'ferm',
    forno: 'forno',
    embalando: 'emb',
  };
  const stageKey = stageKeyMap[status];

  if (!stageKey) return null;

  const stage = product[stageKey];
  if (!stage.lotes.length) return null;

  if (stageKey === 'emb' && stage.done >= tetoEmbalagem(product)) return null;

  const lastHora = stage.lotes[stage.lotes.length - 1].hora;
  const lastMin = toMinutesFromShortClock(lastHora);
  const idle = agoraMin - lastMin;
  if (idle < PAINEL_PRODUCAO_STALL_MIN) return null;

  const stageName = PAINEL_PRODUCAO_STAGES.find((item) => item.key === stageKey)?.name ?? stageKey;
  const label = `${stageName} parada há ${formatDurationFromMinutes(idle)}`.replace(
    'Forno parada',
    'Forno parado',
  );

  return { stage: stageKey, label };
}

function toMinutesFromShortClock(hm: string): number {
  const match = hm.match(/^(\d+)h(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}
