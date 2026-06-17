export const OVERFLOW_MENU_ITEM_HEIGHT_PX = 44;
export const OVERFLOW_MENU_VERTICAL_PADDING_PX = 8;
export const OVERFLOW_MENU_GAP_PX = 8;
export const OVERFLOW_MENU_DEFAULT_WIDTH_PX = 208;

export function estimateOverflowMenuHeight(itemCount: number): number {
  return itemCount * OVERFLOW_MENU_ITEM_HEIGHT_PX + OVERFLOW_MENU_VERTICAL_PADDING_PX;
}
