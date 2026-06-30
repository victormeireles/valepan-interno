import {
  calcularPesoTotalMassaKg,
  type ReceitaMassaIngrediente,
} from '@/domain/receitas/receita-massa-calculo';
import type { ReceitaGramatura } from '@/domain/receitas/receita-gramatura-resolver';

export type ReceitaBrilhoCalculoResultado = {
  quantidade: number;
  volumeLitros: number;
  paesPorLitro: number;
  ingredientesIgnorados: number;
};

export function calcularQuantidadePorProdutoBrilho(
  ingredientes: ReceitaMassaIngrediente[],
  gramaturas: ReceitaGramatura[],
  pesoGramas: number,
): ReceitaBrilhoCalculoResultado | null {
  if (!Number.isFinite(pesoGramas) || pesoGramas <= 0) return null;

  const { totalKg, ingredientesIgnorados } = calcularPesoTotalMassaKg(ingredientes);
  if (totalKg === null || totalKg <= 0) return null;

  const coeficiente = gramaturas.find((item) => item.pesoG === pesoGramas);
  if (!coeficiente || coeficiente.quantidade <= 0) return null;

  const volumeLitros = totalKg;
  const quantidade = Math.round(volumeLitros * coeficiente.quantidade);
  if (quantidade <= 0) return null;

  return {
    quantidade,
    volumeLitros,
    paesPorLitro: coeficiente.quantidade,
    ingredientesIgnorados,
  };
}

export function formatarResumoCalculoBrilho(
  resultado: ReceitaBrilhoCalculoResultado,
  pesoGramas: number,
): string {
  const volumeFormatado = resultado.volumeLitros.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  const paesPorLitroFormatado = resultado.paesPorLitro.toLocaleString('pt-BR');

  let texto = `${volumeFormatado} L × ${paesPorLitroFormatado} pães/L (${pesoGramas} g) = ${resultado.quantidade.toLocaleString('pt-BR')} pães/receita`;
  if (resultado.ingredientesIgnorados > 0) {
    texto += ` (${resultado.ingredientesIgnorados} ingrediente(s) em unidade não conversível ignorado(s))`;
  }
  return texto;
}
