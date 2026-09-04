'use client';

import { useEffect, useRef } from 'react';

export const PAINEL_AUTO_REFRESH_MS = 60_000;

/**
 * Mesmo ritmo do Realizado (60s), com refresh extra ao voltar a ficar visível —
 * TVs ociosas throttleiam setInterval.
 */
export function usePainelAutoRefresh(
  refresh: () => void,
  enabled = true,
  intervalMs = PAINEL_AUTO_REFRESH_MS,
): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => refreshRef.current();
    const interval = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, intervalMs]);
}
