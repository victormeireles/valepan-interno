export type ReceitaMassaIngrediente = {
  quantidade: number;
  unidade: string | null | undefined;
};

export type ReceitaMassaCalculoResultado = {
  quantidade: number;
  pesoTotalKg: number;
  ingredientesIgnorados: number;
};

const KG_ALIASES = new Set(['kg', 'kilograma', 'kilogramas', 'kilo', 'kilos']);
const L_ALIASES = new Set(['l', 'lt', 'lts', 'litro', 'litros']);
const G_ALIASES = new Set(['g', 'gr', 'grama', 'gramas']);
const ML_ALIASES = new Set(['ml', 'mililitro', 'mililitros']);

function normalizarUnidade(unidade: string): string {
  return unidade.toLowerCase().trim().replace(/\s+/g, '');
}

export function converterQuantidadeParaKg(
  quantidade: number,
  unidade: string | null | undefined,
): number | null {
  if (!Number.isFinite(quantidade) || quantidade <= 0) return 0;
  if (!unidade?.trim()) return null;

  const u = normalizarUnidade(unidade);

  if (KG_ALIASES.has(u)) return quantidade;
  if (L_ALIASES.has(u)) return quantidade;
  if (G_ALIASES.has(u)) return quantidade / 1000;
  if (ML_ALIASES.has(u)) return quantidade / 1000;

  return null;
}

export function calcularPesoTotalMassaKg(ingredientes: ReceitaMassaIngrediente[]): {
  totalKg: number | null;
  ingredientesIgnorados: number;
} {
  if (ingredientes.length === 0) {
    return { totalKg: null, ingredientesIgnorados: 0 };
  }

  let total = 0;
  let ingredientesIgnorados = 0;
  let possuiConversivel = false;

  for (const ingrediente of ingredientes) {
    const kg = converterQuantidadeParaKg(ingrediente.quantidade, ingrediente.unidade);
    if (kg === null) {
      ingredientesIgnorados += 1;
      continue;
    }
    total += kg;
    possuiConversivel = true;
  }

  if (!possuiConversivel) {
    return { totalKg: null, ingredientesIgnorados };
  }

  return { totalKg: total, ingredientesIgnorados };
}

export function calcularQuantidadePorProdutoMassa(
  ingredientes: ReceitaMassaIngrediente[],
  massaCruaGramas: number,
): ReceitaMassaCalculoResultado | null {
  if (!Number.isFinite(massaCruaGramas) || massaCruaGramas <= 0) return null;

  const { totalKg, ingredientesIgnorados } = calcularPesoTotalMassaKg(ingredientes);
  if (totalKg === null || totalKg <= 0) return null;

  const quantidade = Math.round((totalKg * 1000) / massaCruaGramas);
  if (quantidade <= 0) return null;

  return { quantidade, pesoTotalKg: totalKg, ingredientesIgnorados };
}

export function calcularMassaCruaPorUnidade(
  ingredientes: ReceitaMassaIngrediente[],
  quantidadeUnidades: number,
): {
  pesoTotalGramas: number;
  massaCruaGramas: number;
  ingredientesIgnorados: number;
} | null {
  if (!Number.isFinite(quantidadeUnidades) || quantidadeUnidades <= 0) return null;

  const { totalKg, ingredientesIgnorados } = calcularPesoTotalMassaKg(ingredientes);
  if (totalKg === null || totalKg <= 0) return null;

  const pesoTotalGramas = totalKg * 1000;
  const massaCruaGramas = pesoTotalGramas / quantidadeUnidades;

  return { pesoTotalGramas, massaCruaGramas, ingredientesIgnorados };
}

export function formatarResumoCalculoMassa(
  resultado: ReceitaMassaCalculoResultado,
  massaCruaGramas: number,
): string {
  const pesoFormatado = resultado.pesoTotalKg.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

  let texto = `${pesoFormatado} kg ÷ ${massaCruaGramas} g (massa crua) = ${resultado.quantidade.toLocaleString('pt-BR')} pães/receita`;
  if (resultado.ingredientesIgnorados > 0) {
    texto += ` (${resultado.ingredientesIgnorados} ingrediente(s) em unidade não pesável ignorado(s))`;
  }
  return texto;
}
