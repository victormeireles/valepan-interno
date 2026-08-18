import { PAINEL_PRODUCAO_STAGES } from './painel-producao-constants';
import { janelaExpectedFraction } from './painel-producao-time';
import type {
  PainelProducaoAreaId,
  PainelProducaoAreaView,
  PainelProducaoProduct,
  PainelProducaoRitmoEntry,
} from './painel-producao-types';
import { buildRitmoComparisons } from './painel-producao-ritmo';
import type { PainelProducaoAreaWindow } from './painel-producao-windows';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';

const STAGE_KEY: Record<PainelProducaoAreaId, 'ferm' | 'forno' | 'emb'> = {
  ferm: 'ferm',
  forno: 'forno',
  emb: 'emb',
};

const STAGE_FINALIZADA: Record<
  PainelProducaoAreaId,
  (product: PainelProducaoProduct) => boolean
> = {
  ferm: (product) => product.fermentacaoFinalizada,
  forno: (product) => product.fornoFinalizada,
  emb: (product) => product.embalagemFinalizada,
};

export function isAreaProducaoEncerrada(
  areaId: PainelProducaoAreaId,
  products: PainelProducaoProduct[],
): boolean {
  if (products.length === 0) return false;

  const stageKey = STAGE_KEY[areaId];
  const isFinalizada = STAGE_FINALIZADA[areaId];

  return products.every((product) => {
    const stage = product[stageKey];
    return isFinalizada(product) || stage.done >= stage.meta;
  });
}

export function buildAreasFromProducts(
  products: PainelProducaoProduct[],
  ritmoEntriesByArea: Record<PainelProducaoAreaId, PainelProducaoRitmoEntry[]>,
  ritmoEntriesOntemByArea: Record<PainelProducaoAreaId, PainelProducaoRitmoEntry[]>,
  ritmoEntriesSemanaByArea: Record<PainelProducaoAreaId, PainelProducaoRitmoEntry[]>,
  dateOntem: string | null,
  referenceEndMs: number | null,
  windows: Record<PainelProducaoAreaId, PainelProducaoAreaWindow>,
): PainelProducaoAreaView[] {
  return PAINEL_PRODUCAO_STAGES.map((stage) => {
    const key = stage.key;
    const stageKey = STAGE_KEY[key];
    const done = products.reduce((sum, product) => sum + product[stageKey].done, 0);
    const meta = products.reduce((sum, product) => sum + product[stageKey].meta, 0);
    const window = windows[key];
    const ritmos = buildRitmoComparisons(
      ritmoEntriesByArea[key],
      ritmoEntriesOntemByArea[key],
      ritmoEntriesSemanaByArea[key],
      dateOntem,
      referenceEndMs,
    );

    return {
      id: key,
      name: stage.name,
      icon: stage.icon,
      accent: stage.accent,
      unit: products[0]?.[stageKey].unit ?? (key === 'emb' ? 'cx' : 'lt'),
      done,
      meta,
      ...ritmos,
      ...window,
      producaoEncerrada: isAreaProducaoEncerrada(key, products),
    };
  });
}

export function resolveGargaloAreaId(
  areas: PainelProducaoAreaView[],
  agoraMin: number,
): PainelProducaoAreaId {
  const worst = areas.reduce<{ id: PainelProducaoAreaId; v: number } | null>((acc, area) => {
    const expected = janelaExpectedFraction(agoraMin, area.janelaIni, area.janelaFim);
    const shortfall = area.meta > 0 ? area.done / area.meta - expected : 0;
    if (acc == null || shortfall < acc.v) {
      return { id: area.id, v: shortfall };
    }
    return acc;
  }, null);

  return worst?.id ?? 'ferm';
}

export function resolveReferenceEndMs(dateISO: string, agoraMin: number): number {
  const hour = Math.floor(agoraMin / 60);
  const minute = agoraMin % 60;
  const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return brazilClockUtcMs(dateISO, clock);
}

export function expectedPctForArea(area: PainelProducaoAreaView, agoraMin: number): number {
  return Math.round(janelaExpectedFraction(agoraMin, area.janelaIni, area.janelaFim) * 100);
}

export function progressPctForArea(area: Pick<PainelProducaoAreaView, 'done' | 'meta'>): number {
  if (area.meta <= 0) return 0;
  return Math.min(100, Math.round((area.done / area.meta) * 100));
}
