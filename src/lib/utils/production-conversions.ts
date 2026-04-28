export type Station =
  | "planejamento"
  | "massa"
  | "fermentacao"
  | "entrada_forno"
  | "saida_forno"
  | "entrada_embalagem"
  | "saida_embalagem";

export type ProductConversionInfo = {
  unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
  package_units?: number | null;
  box_units?: number | null;
  unidades_assadeira?: number | null;
  /** Cadastro de latas: espelha a lata antiga; opcional na UI de planejamento. */
  unidades_lata_antiga?: number | null;
  /** Cadastro de latas: unidades por lata nova (null = produto não usa lata nova neste cadastro). */
  unidades_lata_nova?: number | null;
  receita_massa?: {
    quantidade_por_produto: number; // Unidades do produto que 1 receita produz
  } | null;
};

export type StationQuantity = {
  value: number;
  unitLabel: string;
  readable: string;
  hasWarning?: boolean; // Indica se há algum problema (ex: receita não encontrada)
  warningMessage?: string;
  // Conversões adicionais para planejamento e massa
  receitas?: {
    value: number;
    readable: string;
    hasWarning?: boolean;
  };
  assadeiras?: {
    value: number;
    readable: string;
    unidadesPorAssadeira?: number;
  };
  unidades?: {
    value: number;
    readable: string;
  };
};

import { formatNumberWithThousands, formatIntegerWithThousands } from './number-utils';

const formatNumber = (value: number) =>
  formatNumberWithThousands(value);

/**
 * Latas (LT) na UI de produção: valores inteiros, arredondamento para cima
 * (ex.: 25,708 → 26), para não exibir quebrado.
 */
function latasLtParaExibicao(latasBruto: number): number {
  if (!Number.isFinite(latasBruto) || latasBruto <= 0) return 0;
  return Math.ceil(latasBruto - 1e-9);
}

function assadeirasLtReadable(
  latasBruto: number,
  unidadesPorAssadeira: number | null | undefined,
): { value: number; readable: string } {
  const value = latasLtParaExibicao(latasBruto);
  let readable = `${formatIntegerWithThousands(value)} LT`;
  if (unidadesPorAssadeira != null && unidadesPorAssadeira > 0) {
    readable += ` c/ ${formatIntegerWithThousands(unidadesPorAssadeira)}`;
  }
  return { value, readable };
}

// Formata receitas com no máximo 1 casa decimal (0.5, 1.0, 1.5, etc.)
const formatReceitas = (value: number) => {
  return formatNumberWithThousands(value, { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 1 
  });
};

// Arredonda para o próximo múltiplo de 0.5 (0.5, 1.0, 1.5, 2.0, etc.)
// Exemplo: 0.1 → 0.5, 0.6 → 1.0, 0.9 → 1.0, 1.1 → 1.5
const roundReceitasUp = (value: number): number => {
  return Math.ceil(value * 2) / 2;
};

const getUnitLabel = (product: ProductConversionInfo) =>
  product.unidadeNomeResumido?.trim() || "un";

/** Converte qtd planejada (na unidade padrão do produto) para unidades de consumo usadas nas receitas. */
export function quantidadePlanejadaParaUnidadesConsumo(
  quantity: number,
  product: ProductConversionInfo,
): number {
  const unit = product.unidadeNomeResumido?.toLowerCase().trim() || "";

  // Verifica se é caixa: aceita "cx", "caixa", "caixas" ou se nome_resumido contém "caixa"
  const isCaixa =
    unit === "cx" ||
    unit === "caixa" ||
    unit === "caixas" ||
    unit.includes("caixa");

  if (isCaixa && product.box_units && product.box_units > 0) {
    return quantity * product.box_units;
  }

  // Verifica se é pacote: aceita "pct", "pacote", "pacotes" ou se nome_resumido contém "pacote"
  const isPacote =
    unit === "pct" ||
    unit === "pacote" ||
    unit === "pacotes" ||
    unit.includes("pacote");

  if (isPacote && product.package_units && product.package_units > 0) {
    return quantity * product.package_units;
  }

  return quantity;
}

/** Buckets da planilha de estoque (caixas / pacotes / unidades / kg). */
export type EstoqueQuantidadeBuckets = {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

/**
 * Converte quantidade da planilha de estoque para as mesmas "unidades de consumo"
 * usadas em {@link quantidadePlanejadaParaUnidadesConsumo} (soma cx→un, pct→un, un, e kg se a unidade do produto for massa).
 */
export function quantidadeEstoqueParaUnidadesConsumo(
  q: EstoqueQuantidadeBuckets,
  product: ProductConversionInfo,
): number {
  const unit = product.unidadeNomeResumido?.toLowerCase().trim() || "";

  const isCaixa =
    unit === "cx" ||
    unit === "caixa" ||
    unit === "caixas" ||
    unit.includes("caixa");

  const isPacote =
    unit === "pct" ||
    unit === "pacote" ||
    unit === "pacotes" ||
    unit.includes("pacote");

  const isKg = unit === "kg" || unit.includes("kg");

  let total = 0;

  if (isCaixa && product.box_units && product.box_units > 0) {
    total += (q.caixas || 0) * product.box_units;
  }

  if (isPacote && product.package_units && product.package_units > 0) {
    total += (q.pacotes || 0) * product.package_units;
  }

  total += q.unidades || 0;

  if (isKg) {
    total += q.kg || 0;
  }

  return total;
}

const toUnits = quantidadePlanejadaParaUnidadesConsumo;

/** Inverso de quantidadePlanejadaParaUnidadesConsumo: unidades de consumo → qtd na unidade padrão do cadastro. */
export function unidadesConsumoParaQuantidadePlanejada(
  unidadesConsumo: number,
  product: ProductConversionInfo,
): number {
  const unit = product.unidadeNomeResumido?.toLowerCase().trim() || "";
  const isCaixa =
    unit === "cx" ||
    unit === "caixa" ||
    unit === "caixas" ||
    unit.includes("caixa");
  if (isCaixa && product.box_units && product.box_units > 0) {
    return unidadesConsumo / product.box_units;
  }
  const isPacote =
    unit === "pct" ||
    unit === "pacote" ||
    unit === "pacotes" ||
    unit.includes("pacote");
  if (isPacote && product.package_units && product.package_units > 0) {
    return unidadesConsumo / product.package_units;
  }
  return unidadesConsumo;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toReceitas = (units: number, product: ProductConversionInfo) => {
  const quantidadePorProduto = product.receita_massa?.quantidade_por_produto;
  
  if (!quantidadePorProduto || quantidadePorProduto <= 0) {
    return units;
  }
  
  const receitasCalculadas = units / quantidadePorProduto;
  return receitasCalculadas;
};

/**
 * Converte unidades individuais para assadeiras
 * 
 * FÓRMULA DE CONVERSÃO CAIXAS → ASSADEIRAS:
 * 
 * Passo 1: Caixas → Unidades
 *   unidades_totais = quantidade_planejada × box_units
 *   Exemplo: 10 caixas × 12 unidades/caixa = 120 unidades
 * 
 * Passo 2: Unidades → Assadeiras  
 *   assadeiras = unidades_totais ÷ unidades_assadeira
 *   Exemplo: 120 unidades ÷ 24 unidades/assadeira = 5 assadeiras
 * 
 * FONTE DOS DADOS:
 * - quantidade_planejada: vem de ordens_producao.qtd_planejada
 * - box_units: vem de produtos.box_units
 * - unidades_assadeira: vem de produtos.unidades_assadeira
 */
const toAssadeiras = (units: number, product: ProductConversionInfo) => {
  const unidadesPorAssadeira = product.unidades_assadeira;
  
  if (!unidadesPorAssadeira || unidadesPorAssadeira <= 0) {
    return units;
  }
  
  const assadeirasCalculadas = units / unidadesPorAssadeira;
  return assadeirasCalculadas;
};

/** LT alinhado às receitas arredondadas (0,5). Retorna null se faltar receita ou unidades por assadeira. */
function assadeirasFromReceitasArredondadas(
  receitasArredondadas: number,
  product: ProductConversionInfo,
): number | null {
  const q = product.receita_massa?.quantidade_por_produto;
  const u = product.unidades_assadeira;
  if (!q || q <= 0 || !u || u <= 0) {
    return null;
  }
  return (receitasArredondadas * q) / u;
}

export function getQuantityByStation(
  station: Station,
  quantidadePlanejada: number,
  product: ProductConversionInfo,
): StationQuantity {
  if (station === "massa") {
    const quantidadePorProduto = product.receita_massa?.quantidade_por_produto;

    if (!quantidadePorProduto || quantidadePorProduto <= 0) {
      return {
        value: 0,
        unitLabel: "receitas",
        readable: "Sem receita de massa",
        hasWarning: true,
        warningMessage: "Este produto não possui receita de massa vinculada. Vincule uma receita antes de iniciar a produção.",
      };
    }

    // Passo 1: Converter quantidade planejada (pode ser em caixas, pacotes, unidades) para unidades
    // Exemplo: 10 caixas × 12 unidades/caixa = 120 unidades
    const unidadesTotais = toUnits(quantidadePlanejada, product);
    
    // Passo 2: Converter unidades para receitas
    // Exemplo: 120 unidades ÷ 100 unidades/receita = 1.2 receitas
    const receitasCalculadas = unidadesTotais / quantidadePorProduto;
    
    // Passo 3: Arredondar para o próximo múltiplo de 0.5
    // Exemplo: 0.1 receitas → 0.5 receitas, 0.6 receitas → 1.0 receitas, 1.1 receitas → 1.5 receitas
    const receitasArredondadas = roundReceitasUp(receitasCalculadas);
    
    // Calcular assadeiras (coerente com receitas arredondadas, igual fermentação/demanda OP)
    let assadeirasInfo: { value: number; readable: string; unidadesPorAssadeira?: number } | undefined;
    if (product.unidades_assadeira && product.unidades_assadeira > 0) {
      const assadeirasBruto =
        assadeirasFromReceitasArredondadas(receitasArredondadas, product) ??
        toAssadeiras(unidadesTotais, product);
      const unidadesPorAssadeira = product.unidades_assadeira;
      const { value: assadeiras, readable: readableText } = assadeirasLtReadable(
        assadeirasBruto,
        unidadesPorAssadeira,
      );

      assadeirasInfo = {
        value: assadeiras,
        readable: readableText,
        unidadesPorAssadeira,
      };
    }
    
    // Informação de unidades
    const unidadesInfo = {
      value: unidadesTotais,
      readable: `${formatNumber(unidadesTotais)} un`,
    };
    
    return {
      value: receitasArredondadas,
      unitLabel: "receitas",
      readable: `${formatReceitas(receitasArredondadas)} receitas`,
      receitas: {
        value: receitasArredondadas,
        readable: `${formatReceitas(receitasArredondadas)} receitas`,
      },
      assadeiras: assadeirasInfo,
      unidades: unidadesInfo,
    };
  }

  const baseUnits = toUnits(quantidadePlanejada, product);

  if (
    station === "fermentacao" ||
    station === "entrada_forno" ||
    station === "saida_forno"
  ) {
    const quantidadePorProduto = product.receita_massa?.quantidade_por_produto;
    const unidadesPorAssadeira = product.unidades_assadeira;
    const assadeirasPorReceitas =
      quantidadePorProduto &&
      quantidadePorProduto > 0 &&
      unidadesPorAssadeira &&
      unidadesPorAssadeira > 0
        ? assadeirasFromReceitasArredondadas(
            roundReceitasUp(baseUnits / quantidadePorProduto),
            product,
          )
        : null;
    const assadeirasBruto = assadeirasPorReceitas ?? toAssadeiras(baseUnits, product);
    const { value: assadeiras, readable: readableText } = assadeirasLtReadable(
      assadeirasBruto,
      unidadesPorAssadeira,
    );

    return {
      value: assadeiras,
      unitLabel: "LT",
      readable: readableText,
    };
  }

  // planejamento -> mostra unidade padrão + conversões para receitas e assadeiras
  if (station === "planejamento") {
    const unitLabel = getUnitLabel(product);

    const baseUnits = toUnits(quantidadePlanejada, product);

    // Calcular receitas
    const quantidadePorProduto = product.receita_massa?.quantidade_por_produto;
    let receitasInfo: { value: number; readable: string; hasWarning?: boolean } | undefined;
    let receitasArredondadasPlanej: number | undefined;

    if (quantidadePorProduto && quantidadePorProduto > 0) {
      const receitasCalculadas = baseUnits / quantidadePorProduto;

      const receitasArredondadas = roundReceitasUp(receitasCalculadas);
      receitasArredondadasPlanej = receitasArredondadas;

      receitasInfo = {
        value: receitasArredondadas,
        readable: `${formatReceitas(receitasArredondadas)} receitas`,
      };
    } else {
      receitasInfo = {
        value: 0,
        readable: "Sem receita",
        hasWarning: true,
      };
    }

    // Calcular assadeiras
    let assadeirasInfo: { value: number; readable: string; unidadesPorAssadeira?: number } | undefined;

    if (product.unidades_assadeira && product.unidades_assadeira > 0) {
      const assadeirasBruto =
        receitasArredondadasPlanej !== undefined
          ? assadeirasFromReceitasArredondadas(receitasArredondadasPlanej, product) ??
            toAssadeiras(baseUnits, product)
          : toAssadeiras(baseUnits, product);
      const unidadesPorAssadeira = product.unidades_assadeira;
      const { value: assadeiras, readable: readableText } = assadeirasLtReadable(
        assadeirasBruto,
        unidadesPorAssadeira,
      );

      assadeirasInfo = {
        value: assadeiras,
        readable: readableText,
        unidadesPorAssadeira,
      };
    }

    return {
      value: quantidadePlanejada,
      unitLabel,
      readable: `${formatNumber(quantidadePlanejada)} ${unitLabel}`,
      receitas: receitasInfo,
      assadeiras: assadeirasInfo,
    };
  }

  // embalagem -> unidade padrão
  const unitLabel = getUnitLabel(product);
  return {
    value: quantidadePlanejada,
    unitLabel,
    readable: `${formatNumber(quantidadePlanejada)} ${unitLabel}`,
  };
}

export type MetaCaixasSaidaEmbalagem = {
  /** Quando dá para derivar caixas (cx no planejamento ou conversão por box_units). */
  caixasEsperadas: number | null;
  /** Linha principal (ex.: "10 cx" ou "120 un"). */
  resumo: string;
  subtexto?: string;
};

/**
 * Meta de caixas para conferência na saída da embalagem: planejado do lote,
 * convertido para caixas quando o cadastro permite (unidade cx ou `box_units`).
 */
export function getMetaCaixasSaidaEmbalagem(
  quantidadePlanejada: number,
  product: ProductConversionInfo,
): MetaCaixasSaidaEmbalagem {
  const unit = product.unidadeNomeResumido?.toLowerCase().trim() || '';
  const isCaixa =
    unit === 'cx' ||
    unit === 'caixa' ||
    unit === 'caixas' ||
    unit.includes('caixa');

  if (isCaixa) {
    const v = Number(quantidadePlanejada);
    return {
      caixasEsperadas: Number.isFinite(v) ? v : null,
      resumo: `${formatNumber(v)} cx`,
    };
  }

  const bu = product.box_units;
  if (bu != null && bu > 0) {
    const units = quantidadePlanejadaParaUnidadesConsumo(quantidadePlanejada, product);
    const cx = units / bu;
    const rounded = Math.round(cx * 100) / 100;
    return {
      caixasEsperadas: rounded,
      resumo: `${formatNumberWithThousands(rounded)} cx`,
      subtexto: 'Equivalente em caixas (planejado ÷ unidades por caixa do produto).',
    };
  }

  const sq = getQuantityByStation('saida_embalagem', quantidadePlanejada, product);
  return {
    caixasEsperadas: null,
    resumo: sq.readable,
    subtexto:
      'Planejado na unidade do cadastro; não há conversão para caixas (defina unidades por caixa no produto).',
  };
}


