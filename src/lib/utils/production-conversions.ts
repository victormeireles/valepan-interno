export type Station =
  | "planejamento"
  | "massa"
  | "fermentacao"
  | "forno"
  | "embalagem";

type ProductConversionInfo = {
  unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
  package_units?: number | null;
  box_units?: number | null;
  unidades_assadeira?: number | null;
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

// Arredonda sempre para cima (1 receita, 2 receitas, etc.)
const roundReceitasUp = (value: number): number => {
  return Math.ceil(value);
};

const getUnitLabel = (product: ProductConversionInfo) =>
  product.unidadeNomeResumido?.trim() || "un";

const toUnits = (quantity: number, product: ProductConversionInfo) => {
  const unit = product.unidadeNomeResumido?.toLowerCase().trim() || "";

  // Verifica se é caixa: aceita "cx", "caixa", "caixas" ou se nome_resumido contém "caixa"
  const isCaixa = unit === "cx" || 
                  unit === "caixa" || 
                  unit === "caixas" ||
                  unit.includes("caixa");

  if (isCaixa && product.box_units && product.box_units > 0) {
    const unidadesTotais = quantity * product.box_units;
    return unidadesTotais;
  }

  // Verifica se é pacote: aceita "pct", "pacote", "pacotes" ou se nome_resumido contém "pacote"
  const isPacote = unit === "pct" || 
                   unit === "pacote" || 
                   unit === "pacotes" ||
                   unit.includes("pacote");

  if (isPacote && product.package_units && product.package_units > 0) {
    const unidadesTotais = quantity * product.package_units;
    return unidadesTotais;
  }

  return quantity; // já está em unidades
};

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
    
    // Passo 3: Arredondar sempre para cima (1 receita, 2 receitas, etc.)
    // Exemplo: 1.1 receitas → 2 receitas, 1.9 receitas → 2 receitas
    const receitasArredondadas = roundReceitasUp(receitasCalculadas);
    
    // Calcular assadeiras
    let assadeirasInfo: { value: number; readable: string; unidadesPorAssadeira?: number } | undefined;
    if (product.unidades_assadeira && product.unidades_assadeira > 0) {
      const assadeiras = toAssadeiras(unidadesTotais, product);
      const unidadesPorAssadeira = product.unidades_assadeira;
      
      let readableText = `${formatNumber(assadeiras)} LT`;
      if (unidadesPorAssadeira && unidadesPorAssadeira > 0) {
        readableText += ` c/ ${formatIntegerWithThousands(unidadesPorAssadeira)}`;
      }
      
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
      readable: `${formatIntegerWithThousands(receitasArredondadas)} receitas`,
      receitas: {
        value: receitasArredondadas,
        readable: `${formatIntegerWithThousands(receitasArredondadas)} receitas`,
      },
      assadeiras: assadeirasInfo,
      unidades: unidadesInfo,
    };
  }

  const baseUnits = toUnits(quantidadePlanejada, product);

  if (station === "fermentacao" || station === "forno") {
    const assadeiras = toAssadeiras(baseUnits, product);
    const unidadesPorAssadeira = product.unidades_assadeira;
    
    let readableText = `${formatNumber(assadeiras)} LT`;
    if (unidadesPorAssadeira && unidadesPorAssadeira > 0) {
      readableText += ` c/ ${formatIntegerWithThousands(unidadesPorAssadeira)}`;
    }
    
    return {
      value: assadeiras,
      unitLabel: "LT",
      readable: readableText,
    };
  }

  // planejamento -> mostra unidade padrão + conversões para receitas e assadeiras
  if (station === "planejamento") {
    console.log(`\n[PLANEJAMENTO] Iniciando conversões para planejamento...`);
    
    const unitLabel = getUnitLabel(product);
    console.log(`[PLANEJAMENTO] Unidade padrão: ${unitLabel} (valor original: ${quantidadePlanejada})`);
    
    const baseUnits = toUnits(quantidadePlanejada, product);
    console.log(`[PLANEJAMENTO] Unidades base calculadas: ${baseUnits} unidades\n`);
    
    // Calcular receitas
    const quantidadePorProduto = product.receita_massa?.quantidade_por_produto;
    let receitasInfo: { value: number; readable: string; hasWarning?: boolean } | undefined;
    
    console.log(`[PLANEJAMENTO - Receitas] Iniciando cálculo de receitas...`);
    console.log(`[PLANEJAMENTO - Receitas] quantidade_por_produto: ${quantidadePorProduto} (fonte: produto_receitas.quantidade_por_produto onde tipo='massa')`);
    
    if (quantidadePorProduto && quantidadePorProduto > 0) {
      const receitasCalculadas = baseUnits / quantidadePorProduto;
      console.log(`[PLANEJAMENTO - Receitas] Cálculo: ${baseUnits} unidades ÷ ${quantidadePorProduto} unidades/receita = ${receitasCalculadas.toFixed(4)} receitas`);
      
      const receitasArredondadas = roundReceitasUp(receitasCalculadas);
      console.log(`[PLANEJAMENTO - Receitas] Arredondado para cima: ${receitasCalculadas.toFixed(4)} → ${receitasArredondadas} receitas`);
      
      receitasInfo = {
        value: receitasArredondadas,
        readable: `${formatIntegerWithThousands(receitasArredondadas)} receitas`,
      };
    } else {
      console.log(`[PLANEJAMENTO - Receitas] AVISO: Receita não configurada ou inválida`);
      receitasInfo = {
        value: 0,
        readable: "Sem receita",
        hasWarning: true,
      };
    }
    
    // Calcular assadeiras
    console.log(`\n[PLANEJAMENTO - Assadeiras] Iniciando cálculo de assadeiras...`);
    let assadeirasInfo: { value: number; readable: string; unidadesPorAssadeira?: number } | undefined;
    
    console.log(`[PLANEJAMENTO - Assadeiras] unidades_assadeira: ${product.unidades_assadeira} (fonte: produtos.unidades_assadeira)`);
    
    if (product.unidades_assadeira && product.unidades_assadeira > 0) {
      const assadeiras = toAssadeiras(baseUnits, product);
      const unidadesPorAssadeira = product.unidades_assadeira;
      
      let readableText = `${formatNumber(assadeiras)} LT`;
      if (unidadesPorAssadeira && unidadesPorAssadeira > 0) {
        readableText += ` c/ ${formatIntegerWithThousands(unidadesPorAssadeira)}`;
      }
      
      console.log(`[PLANEJAMENTO - Assadeiras] Resultado final: ${readableText}`);
      
      assadeirasInfo = {
        value: assadeiras,
        readable: readableText,
        unidadesPorAssadeira,
      };
    } else {
      console.log(`[PLANEJAMENTO - Assadeiras] AVISO: unidades_assadeira não configurado ou inválido (${product.unidades_assadeira})`);
    }
    
    console.log(`\n[PLANEJAMENTO] RESUMO FINAL:`);
    console.log(`  - Valor original: ${quantidadePlanejada} ${unitLabel}`);
    console.log(`  - Receitas: ${receitasInfo?.readable || 'N/A'}`);
    console.log(`  - Assadeiras: ${assadeirasInfo?.readable || 'N/A'}`);
    console.log(`====================================================\n`);
    
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


