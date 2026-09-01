'use client';

import { usePathname } from 'next/navigation';
import { filterMainNavEntries } from '@/config/filter-main-nav-entries';
import { MAIN_NAV_ENTRIES } from '@/config/main-nav-config';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type { InternoModuloId, NivelModulo } from '@/lib/auth/interno-modulos-catalog';
import Navigation from './Navigation';

const AUTH_PATH_PREFIXES = ['/login'];
const TV_PATH_PREFIXES = [
  '/painel/fermentacao',
  '/painel/forno',
  '/painel/embalagem',
];

function pathHasPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

type ConditionalNavigationClientProps = {
  isSystemOwner: boolean;
  modulosEfetivos: Partial<Record<InternoModuloId, NivelModulo>>;
};

export default function ConditionalNavigationClient({
  isSystemOwner,
  modulosEfetivos,
}: ConditionalNavigationClientProps) {
  const pathname = usePathname();
  const hideNav =
    pathHasPrefix(pathname, AUTH_PATH_PREFIXES) ||
    pathHasPrefix(pathname, TV_PATH_PREFIXES);

  if (hideNav) return null;

  const snap: UsuarioAuthzSnapshot = {
    isSystemOwner,
    identidades: ['interno'],
    modulosEfetivos,
  };
  const entries = filterMainNavEntries(
    MAIN_NAV_ENTRIES,
    snap,
    new InternoAccessManager(),
  );

  return <Navigation entries={entries} />;
}
