const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function reclamacaoNoPeriodo(
  dataProblema: string,
  de: string | null,
  ate: string | null,
): boolean {
  if (de && dataProblema < de) return false;
  if (ate && dataProblema > ate) return false;
  return true;
}

export function formatarDataIsoPtBr(isoDate: string): string {
  const raw = isoDate.slice(0, 10);
  if (!ISO_DATE.test(raw)) return isoDate;
  const [ano, mes, dia] = raw.split('-');
  return `${dia}/${mes}/${ano}`;
}
