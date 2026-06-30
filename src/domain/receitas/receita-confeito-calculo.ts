import {
  calcularQuantidadePorProdutoCoeficienteGramatura,
  formatarResumoCalculoCoeficienteGramatura,
  type ReceitaCoeficienteGramaturaResultado,
} from '@/domain/receitas/receita-coeficiente-gramatura-calculo';
import type { ReceitaMassaIngrediente } from '@/domain/receitas/receita-massa-calculo';
import type { ReceitaGramatura } from '@/domain/receitas/receita-gramatura-resolver';

export type ReceitaConfeitoCalculoResultado = ReceitaCoeficienteGramaturaResultado & {
  pesoTotalKg: number;
  paesPorKg: number;
};

function mapResultadoConfeito(
  resultado: ReceitaCoeficienteGramaturaResultado,
): ReceitaConfeitoCalculoResultado {
  return {
    ...resultado,
    pesoTotalKg: resultado.totalKg,
    paesPorKg: resultado.paesPorUnidade,
  };
}

export function calcularQuantidadePorProdutoConfeito(
  ingredientes: ReceitaMassaIngrediente[],
  gramaturas: ReceitaGramatura[],
  pesoGramas: number,
): ReceitaConfeitoCalculoResultado | null {
  const resultado = calcularQuantidadePorProdutoCoeficienteGramatura(
    ingredientes,
    gramaturas,
    pesoGramas,
  );
  return resultado ? mapResultadoConfeito(resultado) : null;
}

export function formatarResumoCalculoConfeito(
  resultado: ReceitaConfeitoCalculoResultado,
  pesoGramas: number,
): string {
  return formatarResumoCalculoCoeficienteGramatura('kg', resultado, pesoGramas);
}
