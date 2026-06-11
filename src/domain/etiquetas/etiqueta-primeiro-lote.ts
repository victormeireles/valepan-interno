import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';

function isProduzidoOnDate(produzidoEm: string, dateIso: string): boolean {
  const start = `${dateIso}T00:00:00`;
  const end = `${dateIso}T23:59:59.999`;
  return produzidoEm >= start && produzidoEm <= end;
}

function lotesDoDia(lotes: EmbalagemLoteRecord[], dateIso: string): EmbalagemLoteRecord[] {
  return lotes.filter((lote) => isProduzidoOnDate(lote.produzidoEm, dateIso));
}

export function findPrimeiroLoteCriadoDoDia(
  lotes: EmbalagemLoteRecord[],
  dateIso: string,
): EmbalagemLoteRecord | undefined {
  const onDate = lotesDoDia(lotes, dateIso);
  if (onDate.length === 0) return undefined;
  return [...onDate].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

export function findPrimeiroLoteProduzidoDoDia(
  lotes: EmbalagemLoteRecord[],
  dateIso: string,
): EmbalagemLoteRecord | undefined {
  const onDate = lotesDoDia(lotes, dateIso);
  if (onDate.length === 0) return undefined;
  return [...onDate].sort((a, b) => a.produzidoEm.localeCompare(b.produzidoEm))[0];
}
