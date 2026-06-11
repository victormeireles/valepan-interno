'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type ProdutoConfigMenuAction = 'assadeiras';

type MenuItem = {
  id: ProdutoConfigMenuAction;
  label: string;
  icon: string;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'assadeiras', label: 'Assadeiras', icon: 'bakery_dining' },
];

type Props = {
  onSelect: (action: ProdutoConfigMenuAction) => void;
};

export default function ProdutoConfigOverflowMenu({ onSelect }: Props) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div ref={rootRef} className="relative">
      <button
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

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
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
        </div>
      )}
    </div>
  );
}
