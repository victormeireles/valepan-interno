'use client';

import { createContext, useContext } from 'react';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import type { FluxoDisplayMode } from './fluxo-display-scale';

type FluxoDisplayContextValue = {
  mode: FluxoDisplayMode;
  setMode: (mode: FluxoDisplayMode) => void;
  scale: FluxoDisplayScale;
};

const FluxoDisplayContext = createContext<FluxoDisplayContextValue | null>(null);

export function useFluxoDisplay(): FluxoDisplayContextValue {
  const ctx = useContext(FluxoDisplayContext);
  if (!ctx) {
    throw new Error('useFluxoDisplay deve ser usado dentro de FluxoDisplayProvider');
  }
  return ctx;
}

export { FluxoDisplayContext };
