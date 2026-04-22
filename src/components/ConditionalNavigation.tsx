'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Páginas que usam header customizado (DashboardHeader / RealizadoHeader) — sem barra duplicada do Navigation
  const isRealizadoPage = pathname?.startsWith('/realizado/');
  const isDashboardPage = pathname?.startsWith('/painel/dashboard-estoque');
  const isProducaoPage = pathname?.startsWith('/producao/');
  const isInsumosPage = pathname?.startsWith('/insumos');
  const isReceitasPage = pathname?.startsWith('/receitas');
  const isProdutosPage = pathname?.startsWith('/produtos');

  if (
    isRealizadoPage ||
    isDashboardPage ||
    isProducaoPage ||
    isInsumosPage ||
    isReceitasPage ||
    isProdutosPage
  ) {
    return <Navigation hideHeader />;
  }
  
  // Nas outras páginas, renderizar Navigation completo
  return <Navigation />;
}

