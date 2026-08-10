'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

const AUTH_PATH_PREFIXES = ['/login', '/sem-acesso'];

export default function ConditionalNavigation() {
  const pathname = usePathname();
  const hideNav = AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (hideNav) return null;
  return <Navigation />;
}
