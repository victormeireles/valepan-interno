export const configTableHeadCellClass = 'px-3 py-1.5';

export const configTableBodyCellClass = 'px-3 py-1.5 align-middle leading-snug';

export const configTableOverflowTriggerClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 [&_.material-icons]:text-[1.25rem]';

export const configTableDenseBadgeClass =
  'px-1.5 py-0 text-[11px] leading-5 [&_.material-icons]:!text-[14px]';

export const configSortButtonClass =
  'inline-flex items-center gap-1 rounded-lg px-1 uppercase tracking-wide text-[11px] font-semibold text-stone-500 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500';

export const configTableRowBaseClass =
  'cursor-pointer transition-colors hover:bg-amber-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500';

export function configTableZebraRowClass(index: number): string {
  return [
    'transition-colors hover:bg-amber-50/40',
    index % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
  ].join(' ');
}

export function configTableRowClass(index: number, inactive = false): string {
  return [
    configTableRowBaseClass,
    index % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
    inactive ? 'opacity-60' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function configMobileRowClass(index: number): string {
  return [
    'flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors',
    'hover:bg-amber-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500',
    index % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
  ].join(' ');
}

export function formatNumericZero(value: number | null | undefined): string {
  if (value == null || value === 0) return '—';
  return String(value);
}
