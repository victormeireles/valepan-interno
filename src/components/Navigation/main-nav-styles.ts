export const DESKTOP_NAV_TRIGGER_CLASS = [
  'inline-flex min-h-11 items-center gap-1 rounded-[9px] border px-2 py-1.5',
  'text-[0.8125rem] font-medium leading-none tracking-[-0.004em] whitespace-nowrap',
  'transition-[background,color,border-color] duration-[130ms] ease-out',
].join(' ');

export function desktopNavTriggerState(active: boolean, open: boolean): string {
  if (active || open) {
    return 'border-white/35 bg-white/10 text-white';
  }
  return 'border-transparent text-white/65 hover:bg-white/8 hover:text-white/90';
}

export function desktopNavLinkState(active: boolean): string {
  return [
    DESKTOP_NAV_TRIGGER_CLASS,
    active
      ? 'border-white/35 bg-white/10 text-white'
      : 'border-transparent text-white/65 hover:bg-white/8 hover:text-white/90',
  ].join(' ');
}

export const DROPDOWN_PANEL_CLASS = [
  'absolute left-0 top-full z-50 min-w-[11rem] pt-1',
].join(' ');

export const DROPDOWN_MENU_CLASS = [
  'overflow-hidden rounded-xl border border-stone-200 bg-white py-1',
  'shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)]',
].join(' ');

export const DROPDOWN_ITEM_CLASS = [
  'flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm font-medium tracking-[-0.004em]',
  'text-stone-700 transition-colors duration-[130ms] hover:bg-amber-50 hover:text-amber-900',
].join(' ');

export function dropdownItemState(active: boolean): string {
  return active
    ? `${DROPDOWN_ITEM_CLASS} bg-amber-50 text-amber-900`
    : DROPDOWN_ITEM_CLASS;
}
