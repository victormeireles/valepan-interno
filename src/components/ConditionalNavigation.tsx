'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Páginas que usam header customizado ao invés do Navigation header
  const isRealizadoPage = pathname?.startsWith('/realizado/');
  const isDashboardPage = pathname?.startsWith('/painel/dashboard-estoque');
  const isProducaoPage = pathname?.startsWith('/producao/');
  const isInsumosPage = pathname?.startsWith('/insumos');
  const isReceitasPage = pathname?.startsWith('/receitas');
  const isProdutoReceitasPage = pathname?.startsWith('/produtos/receitas');

  if (
    isRealizadoPage ||
    isDashboardPage ||
    isProducaoPage ||
    isInsumosPage ||
    isReceitasPage ||
    isProdutoReceitasPage
  ) {
    // Nessas páginas, só renderizar o menu lateral (sem o header)
    return <Navigation hideHeader />;
  }
  
  // Nas outras páginas, renderizar Navigation completo
  return <Navigation />;
}

