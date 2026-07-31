export function normalizarCnpj(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === 14 ? digits : null;
}

export function isCnpjValido(digits: string | null | undefined): digits is string {
  return typeof digits === 'string' && /^[0-9]{14}$/.test(digits);
}

export function formatarCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
