'use client';

import { useSyncExternalStore } from 'react';

const KIOSK_MQ = '(min-width: 1024px)';

function subscribe(onStoreChange: () => void): () => void {
  const mq = window.matchMedia(KIOSK_MQ);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function kioskSnapshot(): boolean {
  return window.matchMedia(KIOSK_MQ).matches;
}

/** TV/kiosk em lg+; no SSR assume celular para o gráfico nascer com altura própria. */
export function usePainelEtapaTvKiosk(): boolean {
  return useSyncExternalStore(subscribe, kioskSnapshot, () => false);
}
