import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import { formatCompactNumber } from '@/lib/utils/format-compact-number';

/** @deprecated Prefer `formatCompactNumber` de `@/lib/utils/format-compact-number`. */
export function fmtUn(n: number): string {
  return formatCompactNumber(n);
}

/** @deprecated Prefer `formatCompactNumber` de `@/lib/utils/format-compact-number`. */
export function fmtK(n: number): string {
  return formatCompactNumber(n);
}

export function hhmm(m: number): string {
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`;
}

export function durOf(m: number): string {
  if (m >= 60) {
    return `${Math.floor(m / 60)}h${String(Math.round(m) % 60).padStart(2, '0')}`;
  }
  return `${Math.round(m)}min`;
}

export function rotuloAssadeira(a: string): string {
  return a === 'N/A' ? 'Sem assadeira' : a;
}

export const FLUXO_UI_ETAPA_COR: Record<FluxoEtapaKey, string> = {
  ferm: '#C6A848',
  forno: '#C2410C',
  emb: '#9A6B43',
};

export function diaAnteriorLabelFromDia(dia: string): string {
  // dia = "12/08/2026" → "11/08"
  const parts = dia.split('/');
  if (parts.length < 3) return dia;
  const d = Number(parts[0]);
  const m = Number(parts[1]);
  const y = Number(parts[2]);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
