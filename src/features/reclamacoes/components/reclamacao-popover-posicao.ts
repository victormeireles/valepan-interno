const GAP_PX = 8;

export function posicaoPopoverAncora(
  anchor: { left: number; right: number; top: number; height: number },
  size: { width: number; height: number },
): { top: number; left: number } {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;

  let left = anchor.left - size.width - GAP_PX;
  if (left < GAP_PX) {
    left = Math.min(anchor.right + GAP_PX, viewportWidth - size.width - GAP_PX);
  }

  let top = anchor.top + anchor.height / 2 - size.height / 2;
  const maxTop = viewportHeight - size.height - GAP_PX;
  if (top < GAP_PX) top = GAP_PX;
  if (top > maxTop) top = Math.max(GAP_PX, maxTop);

  return { top, left };
}
