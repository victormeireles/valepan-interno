'use client';

import { useSyncExternalStore } from 'react';
import { PainelEtapaTvFit } from '@/domain/painel-etapa-tv/painel-etapa-tv-fit';

function subscribe(onStoreChange: () => void): () => void {
  const mq = window.matchMedia(PainelEtapaTvFit.mediaQuery());
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function kioskSnapshot(): boolean {
  return window.matchMedia(PainelEtapaTvFit.mediaQuery()).matches;
}

/** TV/kiosk em landscape ≥768×480; no SSR assume celular para o gráfico nascer com altura própria. */
export function usePainelEtapaTvKiosk(): boolean {
  return useSyncExternalStore(subscribe, kioskSnapshot, () => false);
}
