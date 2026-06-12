'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type ProdutoConfigMenuAction = 'assadeiras';

type MenuItem = {
  id: ProdutoConfigMenuAction;
  label: string;
  icon: string;
};

type MenuPosition = {
  top: number;
  left: number;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'assadeiras', label: 'Assadeiras', icon: 'bakery_dining' },
];

const MENU_WIDTH_PX = 208;
const MENU_ITEM_HEIGHT_PX = 44;
const MENU_GAP_PX = 8;

type Props = {
  onSelect: (action: ProdutoConfigMenuAction) => void;
};

function computeMenuPosition(anchor: HTMLElement): MenuPosition {
  const rect = anchor.getBoundingClientRect();
  const menuHeight = MENU_ITEMS.length * MENU_ITEM_HEIGHT_PX + 8;

  let top = rect.bottom + MENU_GAP_PX;
  if (top + menuHeight > window.innerHeight - MENU_GAP_PX) {
    top = rect.top - MENU_GAP_PX - menuHeight;
  }

  let left = rect.right - MENU_WIDTH_PX;
  left = Math.max(MENU_GAP_PX, Math.min(left, window.innerWidth - MENU_WIDTH_PX - MENU_GAP_PX));
  top = Math.max(MENU_GAP_PX, top);

  return { top, left };
}

export default function ProdutoConfigOverflowMenu({ onSelect }: Props) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
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
      if (!buttonRef.current) return;
      setPosition(computeMenuPosition(buttonRef.current));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

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

  const handleSelect = (action: ProdutoConfigMenuAction) => {
    setOpen(false);
    onSelect(action);
  };

  const menu =
    open && position && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH_PX }}
            className="fixed z-50 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          >
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(item.id)}
                className="flex w-full min-h-11 items-center gap-3 px-4 text-left text-sm text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
              >
                <span className="material-icons text-base text-gray-500" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
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
        aria-label="Opções de configuração do produto"
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="material-icons" aria-hidden="true">
          more_vert
        </span>
      </button>
      {menu}
    </>
  );
}
