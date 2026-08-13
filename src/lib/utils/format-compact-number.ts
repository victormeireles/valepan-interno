/**
 * Formatação compacta de quantidades (un, LT, etc.) em pt-BR.
 *
 * - &lt; 1.000 → inteiro (1.234 → não; 999 → 999)
 * - 1.000–9.999 → milhar com 1 casa (1.234 → 1,2k)
 * - 10.000–999.999 → milhar sem casas (12.345 → 12k)
 * - 1.000.000–9.999.999 → milhão com 1 casa (1.234.567 → 1,2M)
 * - ≥ 10.000.000 → milhão sem casas (12.345.678 → 12M)
 */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';

  const sign = value < 0 ? '-' : '';
  const n = Math.abs(value);

  if (n < 1_000) {
    return sign + Math.round(n).toLocaleString('pt-BR');
  }

  if (n < 10_000) {
    return sign + formatScaled(n / 1_000, 1) + 'k';
  }

  if (n < 1_000_000) {
    const milhares = Math.round(n / 1_000);
    if (milhares >= 1_000) {
      return sign + formatScaled(n / 1_000_000, 1) + 'M';
    }
    return sign + formatScaled(n / 1_000, 0) + 'k';
  }

  if (n < 10_000_000) {
    return sign + formatScaled(n / 1_000_000, 1) + 'M';
  }

  return sign + formatScaled(n / 1_000_000, 0) + 'M';
}

function formatScaled(scaled: number, fractionDigits: number): string {
  const rounded =
    fractionDigits === 0
      ? Math.round(scaled)
      : Math.round(scaled * 10 ** fractionDigits) / 10 ** fractionDigits;

  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}
