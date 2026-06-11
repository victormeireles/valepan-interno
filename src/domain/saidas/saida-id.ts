const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSaidaId(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export function parseSaidaId(value: string): string | null {
  const trimmed = value.trim();
  return isValidSaidaId(trimmed) ? trimmed : null;
}

export function saidaIdToDriveRowNumber(saidaId: string): number {
  return (parseInt(saidaId.replace(/-/g, '').slice(0, 8), 16) % 1_000_000) + 2;
}
