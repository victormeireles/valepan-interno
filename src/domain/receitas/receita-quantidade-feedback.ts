import {
  calcularPesoTotalMassaKg,
  type ReceitaMassaIngrediente,
} from '@/domain/receitas/receita-massa-calculo';

export type TipoReceitaComFeedbackQuantidade = 'massa' | 'confeito' | 'brilho';

const TIPOS_COM_FEEDBACK: TipoReceitaComFeedbackQuantidade[] = ['massa', 'confeito', 'brilho'];

export function receitaTipoUsaFeedbackQuantidadeManual(
  tipo: string,
): tipo is TipoReceitaComFeedbackQuantidade {
  return TIPOS_COM_FEEDBACK.includes(tipo as TipoReceitaComFeedbackQuantidade);
}

export function deveMostrarFeedbackQuantidadeManual(
  quantidadeInformada: number | undefined,
  quantidadeSugerida: number | null,
): boolean {
  if (quantidadeInformada == null || quantidadeInformada <= 0) return true;
  if (quantidadeSugerida == null) return true;
  return quantidadeInformada !== quantidadeSugerida;
}

function appendIngredientesIgnorados(texto: string, ingredientesIgnorados: number): string {
  if (ingredientesIgnorados <= 0) return texto;
  return `${texto} (${ingredientesIgnorados} ingrediente(s) em unidade não pesável ignorado(s))`;
}

function formatarTotalKg(totalKg: number): string {
  return totalKg.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function formatarFeedbackQuantidadeMassa(
  ingredientes: ReceitaMassaIngrediente[],
  quantidadeInformada: number | undefined,
  quantidadeSugerida: number | null,
): string | null {
  if (!deveMostrarFeedbackQuantidadeManual(quantidadeInformada, quantidadeSugerida)) {
    return null;
  }

  const { totalKg, ingredientesIgnorados } = calcularPesoTotalMassaKg(ingredientes);
  if (totalKg === null || totalKg <= 0) return null;

  const pesoTotalGramas = Math.round(totalKg * 1000);
  let texto = `Massa total: ${pesoTotalGramas.toLocaleString('pt-BR')} g`;

  if (quantidadeInformada != null && quantidadeInformada > 0) {
    const massaCruaGramas = Math.round(pesoTotalGramas / quantidadeInformada);
    texto += ` ÷ ${quantidadeInformada.toLocaleString('pt-BR')} = ${massaCruaGramas.toLocaleString('pt-BR')} g de massa crua por unidade`;
  }

  return appendIngredientesIgnorados(texto, ingredientesIgnorados);
}

export function formatarFeedbackQuantidadeConfeito(
  ingredientes: ReceitaMassaIngrediente[],
  quantidadeInformada: number | undefined,
  quantidadeSugerida: number | null,
): string | null {
  if (!deveMostrarFeedbackQuantidadeManual(quantidadeInformada, quantidadeSugerida)) {
    return null;
  }

  const { totalKg, ingredientesIgnorados } = calcularPesoTotalMassaKg(ingredientes);
  if (totalKg === null || totalKg <= 0) return null;

  let texto = `Peso total: ${formatarTotalKg(totalKg)} kg`;

  if (quantidadeInformada != null && quantidadeInformada > 0) {
    const confeitoGramas = Math.round((totalKg * 1000) / quantidadeInformada);
    texto += ` ÷ ${quantidadeInformada.toLocaleString('pt-BR')} = ${confeitoGramas.toLocaleString('pt-BR')} g de confeito por unidade`;
  }

  return appendIngredientesIgnorados(texto, ingredientesIgnorados);
}

export function formatarFeedbackQuantidadeBrilho(
  ingredientes: ReceitaMassaIngrediente[],
  quantidadeInformada: number | undefined,
  quantidadeSugerida: number | null,
): string | null {
  if (!deveMostrarFeedbackQuantidadeManual(quantidadeInformada, quantidadeSugerida)) {
    return null;
  }

  const { totalKg, ingredientesIgnorados } = calcularPesoTotalMassaKg(ingredientes);
  if (totalKg === null || totalKg <= 0) return null;

  let texto = `Volume total: ${formatarTotalKg(totalKg)} L`;

  if (quantidadeInformada != null && quantidadeInformada > 0) {
    const brilhoMl = (totalKg * 1000) / quantidadeInformada;
    const brilhoFormatado = brilhoMl.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    texto += ` ÷ ${quantidadeInformada.toLocaleString('pt-BR')} = ${brilhoFormatado} ml de brilho por unidade`;
  }

  return appendIngredientesIgnorados(texto, ingredientesIgnorados);
}

export function formatarFeedbackQuantidadeReceita(
  tipo: TipoReceitaComFeedbackQuantidade,
  ingredientes: ReceitaMassaIngrediente[],
  quantidadeInformada: number | undefined,
  quantidadeSugerida: number | null,
): string | null {
  switch (tipo) {
    case 'massa':
      return formatarFeedbackQuantidadeMassa(ingredientes, quantidadeInformada, quantidadeSugerida);
    case 'confeito':
      return formatarFeedbackQuantidadeConfeito(
        ingredientes,
        quantidadeInformada,
        quantidadeSugerida,
      );
    case 'brilho':
      return formatarFeedbackQuantidadeBrilho(
        ingredientes,
        quantidadeInformada,
        quantidadeSugerida,
      );
  }
}
