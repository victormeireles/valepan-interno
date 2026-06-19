'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  match?: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: 'home', match: (p) => p === '/' },
  {
    href: '/ordens-producao',
    label: 'Ordens',
    icon: 'format_list_numbered',
    match: (p) => p.startsWith('/ordens-producao'),
  },
  {
    href: '/realizado/fermentacao',
    label: 'Fermentação',
    icon: 'eco',
    match: (p) => p.startsWith('/realizado/fermentacao'),
  },
  {
    href: '/realizado/forno',
    label: 'Forno',
    icon: 'local_fire_department',
    match: (p) => p.startsWith('/realizado/forno'),
  },
  {
    href: '/realizado/embalagem',
    label: 'Embalagem',
    icon: 'inventory_2',
    match: (p) => p.startsWith('/realizado/embalagem'),
  },
  {
    href: '/realizado/saidas',
    label: 'Saídas',
    icon: 'assignment_turned_in',
    match: (p) => p.startsWith('/realizado/saidas'),
  },
  {
    href: '/etiquetas',
    label: 'Etiquetas',
    icon: 'label',
    match: (p) => p.startsWith('/etiquetas'),
  },
  {
    href: '/painel/dashboard-estoque',
    label: 'Estoque',
    icon: 'dashboard',
    match: (p) => p.startsWith('/painel/dashboard-estoque'),
  },
  {
    href: '/config',
    label: 'Configurações',
    icon: 'settings',
    match: (p) => p.startsWith('/config'),
  },
];

const SIDE_ZONE_CLASS = 'w-[5.5rem] shrink-0 sm:w-[6.5rem] lg:w-[7.5rem]';

function isItemActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

function DesktopNavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={[
        'inline-flex items-center gap-1 rounded-[9px] px-2 py-1.5 text-[0.8125rem] font-medium leading-none tracking-[-0.004em] whitespace-nowrap',
        'transition-[background,color] duration-[130ms] ease-out',
        active
          ? 'border border-white/35 bg-white/10 text-white'
          : 'border border-transparent text-white/65 hover:bg-white/8 hover:text-white/90',
      ].join(' ')}
    >
      <span className="material-icons text-base" aria-label={item.label}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? '';

  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((open) => !open);

  useEffect(() => {
    const handleToggleMenu = () => setMobileOpen((open) => !open);
    window.addEventListener('toggle-menu', handleToggleMenu);
    return () => window.removeEventListener('toggle-menu', handleToggleMenu);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    closeOnDesktop();
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-brand-vinho">
        <div className="flex h-[3.75rem] w-full items-center px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center ${SIDE_ZONE_CLASS}`}>
            <Link href="/" className="shrink-0" onClick={closeMobile}>
              <Image
                src="/logo-full-light.svg"
                alt="Valepan"
                width={88}
                height={28}
                priority
                className="h-7 w-auto"
              />
            </Link>
          </div>

          <nav
            aria-label="Principal"
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
          >
            {NAV_ITEMS.map((item) => (
              <DesktopNavLink
                key={item.href}
                item={item}
                active={isItemActive(item, pathname)}
              />
            ))}
          </nav>

          <div
            className={`hidden items-center justify-end lg:flex ${SIDE_ZONE_CLASS}`}
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={toggleMobile}
            className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-[9px] text-white/90 transition-colors duration-[130ms] hover:bg-white/10 lg:hidden"
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
          >
            <span className="material-icons" aria-hidden="true">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={[
          'fixed right-0 top-0 z-50 flex h-dvh w-[min(100%,20rem)] flex-col border-l border-border-default bg-surface pt-[3.75rem] shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)] transition-transform duration-[220ms] ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        ].join(' ')}
        aria-hidden={!mobileOpen}
      >
        <nav aria-label="Principal mobile" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMobile}
                    className={[
                      'flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium tracking-[-0.004em] transition-colors duration-[130ms]',
                      active
                        ? 'bg-amber-50 text-amber-900'
                        : 'text-stone-700 hover:bg-stone-50',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'material-icons text-xl',
                        active ? 'text-accent' : 'text-stone-500',
                      ].join(' ')}
                      aria-label={item.label}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
