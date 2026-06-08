/**
 * Número do lote = dia do ano da data de fabricação da etiqueta.
 * Equivalente à fórmula da planilha:
 * =SE(I12<>"";I12-DATA(ANO(I12);1;0);"")
 */
export function loteFromDataFabricacaoEtiqueta(
  dataFabricacaoEtiqueta: string | null | undefined,
): number | undefined {
  if (dataFabricacaoEtiqueta == null || dataFabricacaoEtiqueta.trim() === '') {
    return undefined;
  }

  const iso = dataFabricacaoEtiqueta.trim().slice(0, 10);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  const inicioAno = new Date(year, 0, 0);
  const dayOfYear = Math.round(
    (date.getTime() - inicioAno.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (dayOfYear < 1 || dayOfYear > 366) return undefined;
  return dayOfYear;
}
