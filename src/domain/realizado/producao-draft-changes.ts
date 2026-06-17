import type { ProducaoData } from '@/domain/types';

const QTY_FIELDS = ['caixas', 'pacotes', 'unidades', 'kg'] as const;

const PHOTO_FIELDS = [
  'pacoteFotoUrl',
  'pacoteFotoId',
  'etiquetaFotoUrl',
  'etiquetaFotoId',
  'palletFotoUrl',
  'palletFotoId',
  'fornoFotoUrl',
  'fornoFotoId',
  'fermentacaoFotoUrl',
  'fermentacaoFotoId',
] as const;

function hasUnsavedQuantitiesOrObs(data: ProducaoData): boolean {
  const hasQty = QTY_FIELDS.some((field) => (data[field] || 0) > 0);
  const hasObs = Boolean((data.obsEmbalagem || '').trim());
  return hasQty || hasObs;
}

function hasPhotoFieldChanges(current: ProducaoData, baseline: ProducaoData): boolean {
  return PHOTO_FIELDS.some((field) => (current[field] || '') !== (baseline[field] || ''));
}

function hasQuantityOrObsChanges(current: ProducaoData, baseline: ProducaoData): boolean {
  const qtyChanged = QTY_FIELDS.some((field) => (current[field] || 0) !== (baseline[field] || 0));
  const obsChanged =
    (current.obsEmbalagem || '').trim() !== (baseline.obsEmbalagem || '').trim();
  return qtyChanged || obsChanged;
}

export function hasProducaoDraftChanged(
  current: ProducaoData,
  baseline: ProducaoData | null,
  hasNewPhotoFiles: boolean,
): boolean {
  if (hasNewPhotoFiles) return true;
  if (!baseline) return hasUnsavedQuantitiesOrObs(current);
  return hasQuantityOrObsChanges(current, baseline) || hasPhotoFieldChanges(current, baseline);
}
