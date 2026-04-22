/** Converte texto do formulário (vazio ou número ≥ 0) em mm ou null. */
export function parseOptionalDiametroBuracosMm(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
