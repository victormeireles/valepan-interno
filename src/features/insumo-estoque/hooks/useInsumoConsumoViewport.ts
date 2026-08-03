'use client';

import { useEffect, useState } from 'react';

const MD_QUERY = '(min-width: 768px)';

export type ViewportMode = 'desktop' | 'mobile';

/** Resolve viewport after mount to avoid rendering desktop + mobile lists together. */
export class InsumoConsumoViewportResolver {
  resolve(): ViewportMode {
    if (typeof window === 'undefined') return 'mobile';
    return window.matchMedia(MD_QUERY).matches ? 'desktop' : 'mobile';
  }
}

export const insumoConsumoViewportResolver = new InsumoConsumoViewportResolver();

export function useInsumoConsumoViewport(): ViewportMode | null {
  const [mode, setMode] = useState<ViewportMode | null>(null);

  useEffect(() => {
    const media = window.matchMedia(MD_QUERY);
    const sync = () => {
      setMode(insumoConsumoViewportResolver.resolve());
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return mode;
}
