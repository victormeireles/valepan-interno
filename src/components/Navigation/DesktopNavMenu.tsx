'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { MainNavGroup, MainNavLink } from '@/config/main-nav-config';
import { MAIN_NAV_ENTRIES } from '@/config/main-nav-config';
import {
  DESKTOP_NAV_TRIGGER_CLASS,
  DROPDOWN_MENU_CLASS,
  DROPDOWN_PANEL_CLASS,
  desktopNavLinkState,
  desktopNavTriggerState,
  dropdownItemState,
} from '@/components/Navigation/main-nav-styles';

type DesktopNavMenuProps = {
  pathname: string;
};

function DesktopNavLink({ item, active }: { item: MainNavLink; active: boolean }) {
  return (
    <Link href={item.href} className={desktopNavLinkState(active)}>
      <span className="material-icons text-base" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function DesktopNavDropdown({
  group,
  pathname,
  open,
  onOpen,
  onClose,
}: {
  group: MainNavGroup;
  pathname: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const menuId = useId();
  const active = group.match(pathname);

  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        id={`${menuId}-trigger`}
        className={[DESKTOP_NAV_TRIGGER_CLASS, desktopNavTriggerState(active, open)].join(' ')}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={`${menuId}-menu`}
        onClick={() => (open ? onClose() : onOpen())}
      >
        <span className="material-icons text-base" aria-hidden="true">
          {group.icon}
        </span>
        <span>{group.label}</span>
        <span
          className={[
            'material-icons text-base transition-transform duration-[130ms]',
            open ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {open ? (
        <div className={DROPDOWN_PANEL_CLASS}>
          <ul
            id={`${menuId}-menu`}
            role="menu"
            aria-labelledby={`${menuId}-trigger`}
            className={DROPDOWN_MENU_CLASS}
          >
            {group.children.map((child) => {
              const childActive = child.match(pathname);
              return (
                <li key={child.href} role="none">
                  <Link
                    href={child.href}
                    role="menuitem"
                    className={dropdownItemState(childActive)}
                    onClick={onClose}
                  >
                    <span className="material-icons text-lg text-stone-500" aria-hidden="true">
                      {child.icon}
                    </span>
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function DesktopNavMenu({ pathname }: DesktopNavMenuProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const closeDropdown = useCallback(() => setOpenGroupId(null), []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeDropdown]);

  return (
    <nav
      ref={navRef}
      aria-label="Principal"
      className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
    >
      {MAIN_NAV_ENTRIES.map((entry) => {
        if (entry.type === 'link') {
          return (
            <DesktopNavLink
              key={entry.href}
              item={entry}
              active={entry.match(pathname)}
            />
          );
        }

        return (
          <DesktopNavDropdown
            key={entry.id}
            group={entry}
            pathname={pathname}
            open={openGroupId === entry.id}
            onOpen={() => setOpenGroupId(entry.id)}
            onClose={closeDropdown}
          />
        );
      })}
    </nav>
  );
}
