'use client';

import { usePathname } from 'next/navigation';
import type { MainNavEntry } from '@/config/main-nav-config';
import Navigation from './Navigation';

const AUTH_PATH_PREFIXES = ['/login', '/sem-acesso'];

type ConditionalNavigationClientProps = {
  entries: MainNavEntry[];
};

export default function ConditionalNavigationClient({
  entries,
}: ConditionalNavigationClientProps) {
  const pathname = usePathname();
  const hideNav = AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (hideNav) return null;
  return <Navigation entries={entries} />;
}
