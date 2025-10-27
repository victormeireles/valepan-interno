'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Páginas que usam RealizadoHeader ao invés do Navigation header
  const isRealizadoPage = pathname?.startsWith('/realizado/');
  
  if (isRealizadoPage) {
    // Nas páginas Realizado, só renderizar o menu lateral (sem o header)
    return <Navigation hideHeader />;
  }
  
  // Nas outras páginas, renderizar Navigation completo
  return <Navigation />;
}

