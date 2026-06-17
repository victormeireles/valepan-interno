export const ordensProducaoPageClass = 'min-h-screen bg-stone-50';

export const ordensProducaoContainerClass =
  'max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8';

export const ordensProducaoPanelClass =
  'rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden';

export const ordensProducaoTitleClass = 'text-2xl font-bold text-stone-900';

export const ordensProducaoPrimaryButtonClass =
  'min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

export const ordensProducaoSecondaryButtonClass =
  'min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-stone-300 bg-white text-stone-700 rounded-xl font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50';

export const ordensProducaoChipBaseClass =
  'min-h-11 px-4 rounded-full text-sm font-medium border focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

export function ordensProducaoChipClass(active: boolean): string {
  return active
    ? `${ordensProducaoChipBaseClass} border-amber-600 bg-amber-600 text-white`
    : `${ordensProducaoChipBaseClass} border-stone-200 bg-white text-stone-700 hover:bg-stone-50`;
}

export const ordensProducaoDateInputClass =
  'min-h-11 rounded-xl border border-stone-300 px-3 text-stone-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

export const ordensProducaoMetaTextClass = 'text-sm text-stone-500 tabular-nums';

export const ordensProducaoEtiquetaBadgeClass =
  'inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800';

export const ordensProducaoAssadeiraAltBadgeClass =
  'shrink-0 rounded border border-amber-200 bg-amber-50 px-1 py-px text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-800';

export const ordensProducaoRowClass =
  'group border-b border-stone-100 px-3 py-2 last:border-b-0 odd:bg-white even:bg-stone-50/50 hover:bg-amber-50/40';

export const ordensProducaoToastSuccessClass =
  'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800';

export const ordensProducaoToastErrorClass =
  'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800';

export const ordensProducaoPreviewClass =
  'mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900';
