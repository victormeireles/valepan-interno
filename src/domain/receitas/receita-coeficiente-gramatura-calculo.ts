import {
  calcularPesoTotalMassaKg,
  type ReceitaMassaIngrediente,
} from '@/domain/receitas/receita-massa-calculo';
import type { ReceitaGramatura } from '@/domain/receitas/receita-gramatura-resolver';

export type ModoCoeficienteGramatura = 'litro' | 'kg';

export type ReceitaCoeficienteGramaturaResultado = {
  quantidade: number;
  totalKg: number;
  paesPorUnidade: number;
  ingredientesIgnorados: number;
};

export function calcularQuantidadePorProdutoCoeficienteGramatura(
  ingredientes: ReceitaMassaIngrediente[],
  gramaturas: ReceitaGramatura[],
  pesoGramas: number,
): ReceitaCoeficienteGramaturaResultado | null {
  if (!Number.isFinite(pesoGramas) || pesoGramas <= 0) return null;

  const { totalKg, ingredientesIgnorados } = calcularPesoTotalMassaKg(ingredientes);
  if (totalKg === null || totalKg <= 0) return null;

  const coeficiente = gramaturas.find((item) => item.pesoG === pesoGramas);
  if (!coeficiente || coeficiente.quantidade <= 0) return null;

  const quantidade = Math.round(totalKg * coeficiente.quantidade);
  if (quantidade <= 0) return null;

  return {
    quantidade,
    totalKg,
    paesPorUnidade: coeficiente.quantidade,
    ingredientesIgnorados,
  };
}

export function formatarResumoCalculoCoeficienteGramatura(
  modo: ModoCoeficienteGramatura,
  resultado: ReceitaCoeficienteGramaturaResultado,
  pesoGramas: number,
): string {
  const totalFormatado = resultado.totalKg.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  const coeficienteFormatado = resultado.paesPorUnidade.toLocaleString('pt-BR');
  const unidade = modo === 'litro' ? 'L' : 'kg';
  const sufixoCoeficiente = modo === 'litro' ? 'pães/L' : 'pães/kg';

  let texto = `${totalFormatado} ${unidade} × ${coeficienteFormatado} ${sufixoCoeficiente} (${pesoGramas} g) = ${resultado.quantidade.toLocaleString('pt-BR')} pães/receita`;
  if (resultado.ingredientesIgnorados > 0) {
    texto += ` (${resultado.ingredientesIgnorados} ingrediente(s) em unidade não conversível ignorado(s))`;
  }
  return texto;
}
