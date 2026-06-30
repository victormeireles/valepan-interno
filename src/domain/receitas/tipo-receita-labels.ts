import type { Database } from '@/types/database';

export type TipoReceita = Database['public']['Enums']['tipo_receita'];

export const TIPO_RECEITA_LABELS: Record<TipoReceita, string> = {
  massa: 'Massa',
  brilho: 'Brilho',
  confeito: 'Confeito',
  antimofo: 'Antimofo',
  embalagem: 'Embalagem',
  caixa: 'Caixa',
};

export function labelTipoReceita(tipo: TipoReceita): string {
  return TIPO_RECEITA_LABELS[tipo] ?? tipo;
}
