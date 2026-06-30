import type { Database } from '@/types/database';

export type TipoReceita = Database['public']['Enums']['tipo_receita'];

export type ReceitaGramatura = {
  pesoG: number;
  quantidade: number;
};

export const RECEITA_TIPOS_GRAMATURA_DIRETA: TipoReceita[] = [
  'confeito',
  'antimofo',
  'embalagem',
  'caixa',
];

export const RECEITA_TIPOS_COM_GRAMATURA: TipoReceita[] = [
  'brilho',
  ...RECEITA_TIPOS_GRAMATURA_DIRETA,
];

export function receitaTipoUsaGramaturaBrilho(tipo: TipoReceita): boolean {
  return tipo === 'brilho';
}

export function receitaTipoUsaGramaturaDireta(tipo: TipoReceita): boolean {
  return RECEITA_TIPOS_GRAMATURA_DIRETA.includes(tipo);
}

export function receitaTipoUsaGramatura(tipo: TipoReceita): boolean {
  return RECEITA_TIPOS_COM_GRAMATURA.includes(tipo);
}

export function resolverQuantidadePorGramatura(
  gramaturas: ReceitaGramatura[],
  pesoGramas: number | null,
): number | null {
  if (!pesoGramas || pesoGramas <= 0 || gramaturas.length === 0) return null;

  const match = gramaturas.find((item) => item.pesoG === pesoGramas);
  if (!match || match.quantidade <= 0) return null;

  return match.quantidade;
}
