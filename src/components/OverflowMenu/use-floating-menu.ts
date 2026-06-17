'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  computeFloatingMenuPosition,
  type FloatingMenuAlign,
  type FloatingMenuPosition,
} from '@/components/OverflowMenu/compute-floating-menu-position';
import { OVERFLOW_MENU_GAP_PX } from '@/components/OverflowMenu/overflow-menu-constants';

type UseFloatingMenuOptions = {
  menuWidth: number;
  estimatedMenuHeight: number;
  align?: FloatingMenuAlign;
  gap?: number;
};

type UseFloatingMenuResult = {
  menuId: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  position: FloatingMenuPosition | null;
  mounted: boolean;
};

export function useFloatingMenu({
  menuWidth,
  estimatedMenuHeight,
  align = 'end',
  gap = OVERFLOW_MENU_GAP_PX,
}: UseFloatingMenuOptions): UseFloatingMenuResult {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingMenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = buttonRef.current;
      if (!anchor) return;

      const measuredHeight =
        menuRef.current?.getBoundingClientRect().height ?? estimatedMenuHeight;

      setPosition(
        computeFloatingMenuPosition({
          anchorRect: anchor.getBoundingClientRect(),
          menuWidth,
          menuHeight: measuredHeight,
          align,
          gap,
        }),
      );
    };

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, menuWidth, estimatedMenuHeight, align, gap]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return {
    menuId,
    buttonRef,
    menuRef,
    open,
    setOpen,
    toggle: () => setOpen((value) => !value),
    position,
    mounted,
  };
}
