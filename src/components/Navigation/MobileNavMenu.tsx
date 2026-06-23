'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MainNavGroup, MainNavLink } from '@/config/main-nav-config';
import { MAIN_NAV_ENTRIES } from '@/config/main-nav-config';

type MobileNavMenuProps = {
  pathname: string;
  onNavigate: () => void;
};

function MobileNavLink({
  item,
  active,
  onNavigate,
  nested = false,
}: {
  item: MainNavLink;
  active: boolean;
  onNavigate: () => void;
  nested?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={[
        'flex min-h-11 items-center gap-3 rounded-[9px] text-sm font-medium tracking-[-0.004em] transition-colors duration-[130ms]',
        nested ? 'py-2 pl-10 pr-3' : 'px-3 py-2.5',
        active ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50',
      ].join(' ')}
    >
      <span
        className={[
          'material-icons text-xl',
          active ? 'text-accent' : 'text-stone-500',
        ].join(' ')}
        aria-hidden="true"
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function MobileNavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: MainNavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = group.match(pathname);
  const [expanded, setExpanded] = useState(false);
  const showChildren = expanded || active;

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={[
          'flex min-h-11 w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-sm font-medium tracking-[-0.004em] transition-colors duration-[130ms]',
          active ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50',
        ].join(' ')}
        aria-expanded={showChildren}
      >
        <span
          className={[
            'material-icons text-xl',
            active ? 'text-accent' : 'text-stone-500',
          ].join(' ')}
          aria-hidden="true"
        >
          {group.icon}
        </span>
        <span className="flex-1">{group.label}</span>
        <span
          className={[
            'material-icons text-xl text-stone-400 transition-transform duration-[130ms]',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {showChildren ? (
        <ul className="mt-1 space-y-0.5">
          {group.children.map((child) => (
            <li key={child.href}>
              <MobileNavLink
                item={child}
                active={child.match(pathname)}
                onNavigate={onNavigate}
                nested
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function MobileNavMenu({ pathname, onNavigate }: MobileNavMenuProps) {
  return (
    <nav aria-label="Principal mobile" className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-1">
        {MAIN_NAV_ENTRIES.map((entry) => {
          if (entry.type === 'link') {
            return (
              <li key={entry.href}>
                <MobileNavLink
                  item={entry}
                  active={entry.match(pathname)}
                  onNavigate={onNavigate}
                />
              </li>
            );
          }

          return (
            <MobileNavGroup
              key={entry.id}
              group={entry}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          );
        })}
      </ul>
    </nav>
  );
}
