'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DesktopNavMenu from '@/components/Navigation/DesktopNavMenu';
import MobileNavMenu from '@/components/Navigation/MobileNavMenu';

const SIDE_ZONE_CLASS = 'w-[5.5rem] shrink-0 sm:w-[6.5rem] lg:w-[7.5rem]';

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

          <DesktopNavMenu pathname={pathname} />

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
        <MobileNavMenu pathname={pathname} onNavigate={closeMobile} />
      </aside>
    </>
  );
}
