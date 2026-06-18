'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();

  const isRealizadoPage = pathname?.startsWith('/realizado/');
  const isDashboardPage = pathname?.startsWith('/painel/dashboard-estoque');
  const isConfigPage = pathname?.startsWith('/config');

  if (isRealizadoPage || isDashboardPage || isConfigPage) {
    return <Navigation hideHeader />;
  }

  return <Navigation />;
}
