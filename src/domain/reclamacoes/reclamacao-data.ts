const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function dataCombinaFiltroExato(
  data: string,
  filtro: string | null,
): boolean {
  if (!filtro) return true;
  return data.slice(0, 10) === filtro.slice(0, 10);
}

export function formatarDataIsoPtBr(isoDate: string): string {
  const raw = isoDate.slice(0, 10);
  if (!ISO_DATE.test(raw)) return isoDate;
  const [ano, mes, dia] = raw.split('-');
  return `${dia}/${mes}/${ano}`;
}
