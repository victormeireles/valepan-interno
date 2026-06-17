export type FloatingMenuAlign = 'end' | 'start';

export type FloatingMenuPosition = {
  top: number;
  left: number;
};

type ComputeFloatingMenuPositionInput = {
  anchorRect: DOMRect;
  menuWidth: number;
  menuHeight: number;
  align?: FloatingMenuAlign;
  gap?: number;
};

export function computeFloatingMenuPosition({
  anchorRect,
  menuWidth,
  menuHeight,
  align = 'end',
  gap = 8,
}: ComputeFloatingMenuPositionInput): FloatingMenuPosition {
  const viewportPadding = gap;

  const spaceBelow = window.innerHeight - anchorRect.bottom - viewportPadding;
  const spaceAbove = anchorRect.top - viewportPadding;

  let top: number;
  if (menuHeight <= spaceBelow) {
    top = anchorRect.bottom + gap;
  } else if (menuHeight <= spaceAbove) {
    top = anchorRect.top - gap - menuHeight;
  } else if (spaceBelow >= spaceAbove) {
    top = anchorRect.bottom + gap;
  } else {
    top = anchorRect.top - gap - menuHeight;
  }

  top = Math.max(
    viewportPadding,
    Math.min(top, window.innerHeight - menuHeight - viewportPadding),
  );

  let left = align === 'end' ? anchorRect.right - menuWidth : anchorRect.left;
  left = Math.max(
    viewportPadding,
    Math.min(left, window.innerWidth - menuWidth - viewportPadding),
  );

  return { top, left };
}
