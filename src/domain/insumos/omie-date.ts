const DATA_BR_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATA_ISO_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

export function converterDataOmieParaIso(valor: string | null | undefined): string | null {
  if (!valor) {
    return null;
  }

  const trimmed = valor.trim();
  const isoMatch = DATA_ISO_REGEX.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = DATA_BR_REGEX.exec(trimmed);
  if (!brMatch) {
    return null;
  }

  const [, dia, mes, ano] = brMatch;
  return `${ano}-${mes}-${dia}`;
}
