import type { CSSProperties } from 'react';
import type { RealizadoEtapaAccent } from './types';

export type EtapaAccentClasses = {
  topBar: string;
  iconBg: string;
  iconText: string;
  label: string;
  progressFill: string;
  progressText: string;
};

const ACCENT_MAP: Record<RealizadoEtapaAccent, EtapaAccentClasses> = {
  amber: {
    topBar: 'bg-accent',
    iconBg: 'bg-amber-100',
    iconText: 'text-accent',
    label: 'text-accent',
    progressFill: 'bg-accent',
    progressText: 'text-accent',
  },
  gold: {
    topBar: 'bg-[#C6A848]',
    iconBg: 'bg-[#C6A848]/15',
    iconText: 'text-[#9a7f1e]',
    label: 'text-[#9a7f1e]',
    progressFill: 'bg-[#C6A848]',
    progressText: 'text-[#9a7f1e]',
  },
  brasa: {
    topBar: 'bg-[#C2410C]',
    iconBg: 'bg-[#C2410C]/15',
    iconText: 'text-[#C2410C]',
    label: 'text-[#C2410C]',
    progressFill: 'bg-[#C2410C]',
    progressText: 'text-[#C2410C]',
  },
  vinho: {
    topBar: 'bg-[#5A1326]',
    iconBg: 'bg-[#5A1326]/12',
    iconText: 'text-[#5A1326]',
    label: 'text-[#5A1326]',
    progressFill: 'bg-[#5A1326]',
    progressText: 'text-[#5A1326]',
  },
  orange: {
    topBar: 'bg-orange-500',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    label: 'text-orange-600',
    progressFill: 'bg-orange-500',
    progressText: 'text-orange-600',
  },
  sky: {
    topBar: 'bg-sky-500',
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-600',
    label: 'text-sky-600',
    progressFill: 'bg-sky-500',
    progressText: 'text-sky-600',
  },
  rose: {
    topBar: 'bg-rose-500',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    label: 'text-rose-600',
    progressFill: 'bg-rose-500',
    progressText: 'text-rose-600',
  },
};

const ACCENT_HEX: Record<RealizadoEtapaAccent, string> = {
  amber: '#d97706',
  gold: '#C6A848',
  brasa: '#C2410C',
  vinho: '#5A1326',
  orange: '#f97316',
  sky: '#0ea5e9',
  rose: '#f43f5e',
};

export function getEtapaAccentHex(accent: RealizadoEtapaAccent): string {
  return ACCENT_HEX[accent];
}

/** Fundo da toolbar com leve tint da cor da etapa (mockup EtapaScreen). */
export function getEtapaToolbarBackgroundStyle(
  pageBackground: string,
  accent: RealizadoEtapaAccent,
): CSSProperties {
  const accentHex = getEtapaAccentHex(accent);
  return {
    backgroundColor: `color-mix(in srgb, ${accentHex} 5%, color-mix(in srgb, ${pageBackground} 94%, transparent))`,
  };
}

export function getEtapaAccentClasses(accent: RealizadoEtapaAccent): EtapaAccentClasses {
  return ACCENT_MAP[accent];
}
