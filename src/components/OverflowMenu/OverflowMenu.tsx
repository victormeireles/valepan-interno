'use client';

import { Children, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  estimateOverflowMenuHeight,
  OVERFLOW_MENU_DEFAULT_WIDTH_PX,
} from '@/components/OverflowMenu/overflow-menu-constants';
import { useFloatingMenu } from '@/components/OverflowMenu/use-floating-menu';
import type { FloatingMenuAlign } from '@/components/OverflowMenu/compute-floating-menu-position';

type OverflowMenuProps = {
  ariaLabel: string;
  children: ReactNode;
  menuWidth?: number;
  align?: FloatingMenuAlign;
  triggerClassName?: string;
  menuClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

export default function OverflowMenu({
  ariaLabel,
  children,
  menuWidth = OVERFLOW_MENU_DEFAULT_WIDTH_PX,
  align = 'end',
  triggerClassName,
  menuClassName = 'rounded-xl border border-stone-200 bg-white py-1 shadow-lg',
  onOpenChange,
}: OverflowMenuProps) {
  const itemCount = Children.count(children);
  const estimatedMenuHeight = useMemo(
    () => estimateOverflowMenuHeight(itemCount),
    [itemCount],
  );

  const {
    menuId,
    buttonRef,
    menuRef,
    open,
    setOpen,
    position,
    mounted,
  } = useFloatingMenu({
    menuWidth,
    estimatedMenuHeight,
    align,
  });

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const closeMenu = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              width: menuWidth,
              visibility: position ? 'visible' : 'hidden',
            }}
            className={`fixed z-50 ${menuClassName}`}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('[role="menuitem"]')) {
                closeMenu();
              }
            }}
          >
            {children}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={handleToggle}
        className={
          triggerClassName ??
          'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
        }
      >
        <span className="material-icons" aria-hidden="true">
          more_vert
        </span>
      </button>
      {menu}
    </>
  );
}
