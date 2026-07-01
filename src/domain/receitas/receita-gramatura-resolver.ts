import type { Database } from '@/types/database';

export type TipoReceita = Database['public']['Enums']['tipo_receita'];

export type ReceitaGramatura = {
  pesoG: number;
  quantidade: number;
};

import type { ModoCoeficienteGramatura } from '@/domain/receitas/receita-coeficiente-gramatura-calculo';

export const RECEITA_TIPOS_GRAMATURA_DIRETA: TipoReceita[] = [
  'antimofo',
  'embalagem',
  'caixa',
];

export const RECEITA_TIPOS_COEFICIENTE_GRAMATURA: TipoReceita[] = ['brilho', 'confeito'];

// Para massa, as gramaturas guardam pares "gramatura assada -> massa crua (g)".
export const RECEITA_TIPOS_GRAMATURA_MASSA: TipoReceita[] = ['massa'];

export const RECEITA_TIPOS_COM_GRAMATURA: TipoReceita[] = [
  ...RECEITA_TIPOS_GRAMATURA_MASSA,
  ...RECEITA_TIPOS_COEFICIENTE_GRAMATURA,
  ...RECEITA_TIPOS_GRAMATURA_DIRETA,
];

export function receitaTipoUsaGramaturaBrilho(tipo: TipoReceita): boolean {
  return tipo === 'brilho';
}

export function receitaTipoUsaGramaturaConfeito(tipo: TipoReceita): boolean {
  return tipo === 'confeito';
}

export function receitaTipoUsaCalculoCoeficienteGramatura(tipo: TipoReceita): boolean {
  return RECEITA_TIPOS_COEFICIENTE_GRAMATURA.includes(tipo);
}

export function receitaModoCoeficienteGramatura(tipo: TipoReceita): ModoCoeficienteGramatura | null {
  if (tipo === 'brilho') return 'litro';
  if (tipo === 'confeito') return 'kg';
  return null;
}

export function receitaTipoUsaGramaturaDireta(tipo: TipoReceita): boolean {
  return RECEITA_TIPOS_GRAMATURA_DIRETA.includes(tipo);
}

export function receitaTipoUsaGramaturaMassa(tipo: TipoReceita): boolean {
  return RECEITA_TIPOS_GRAMATURA_MASSA.includes(tipo);
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

// Para receitas de massa: dado o peso assado do produto, retorna a massa crua (g)
// cadastrada no par correspondente. Sem par -> null (produto fica sem custo de massa).
export function resolverMassaCruaGramas(
  gramaturas: ReceitaGramatura[],
  pesoAssadoGramas: number | null,
): number | null {
  if (!pesoAssadoGramas || pesoAssadoGramas <= 0 || gramaturas.length === 0) return null;

  const match = gramaturas.find((item) => item.pesoG === pesoAssadoGramas);
  if (!match || match.quantidade <= 0) return null;

  return match.quantidade;
}
