'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();

  const isRealizadoPage = pathname?.startsWith('/realizado/');
  const isDashboardPage = pathname?.startsWith('/painel/dashboard-estoque');
  const isInsumosPage = pathname?.startsWith('/insumos');
  const isReceitasPage = pathname?.startsWith('/receitas');
  const isProdutoReceitasPage = pathname?.startsWith('/produtos/receitas');
  const isConfigPage = pathname?.startsWith('/config');

  if (
    isRealizadoPage ||
    isDashboardPage ||
    isInsumosPage ||
    isReceitasPage ||
    isProdutoReceitasPage ||
    isConfigPage
  ) {
    return <Navigation hideHeader />;
  }

  return <Navigation />;
}
