import type { SaidaQuantidade, SaidaSheetRecord } from '@/domain/types/saidas';

export type SaidasDashboardItem = {
  caixas: number;
  saidaUpdatedAt?: string;
};

export function hasSaidaRegistrada(
  realizado: SaidaQuantidade,
  saidaUpdatedAt?: string,
): boolean {
  if (saidaUpdatedAt?.trim()) return true;
  return (
    (realizado.caixas || 0) +
      (realizado.pacotes || 0) +
      (realizado.unidades || 0) +
      (realizado.kg || 0) >
    0
  );
}

export function saidasToDashboardItems(items: SaidaSheetRecord[]): SaidasDashboardItem[] {
  return items
    .filter((item) => hasSaidaRegistrada(item.realizado, item.saidaUpdatedAt))
    .map((item) => ({
      caixas: item.realizado.caixas || 0,
      saidaUpdatedAt: item.saidaUpdatedAt,
    }));
}

export function sumSaidaCaixas(items: SaidaSheetRecord[]): number {
  return items.reduce((sum, item) => sum + (item.realizado.caixas || 0), 0);
}
