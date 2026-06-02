import {
  quantidadePlanejadaParaUnidadesConsumo,
  type ProductConversionInfo,
} from '@/lib/utils/production-conversions';

export interface EstimateCaixasFromLatasInput {
  latas: number;
  /**
   * Unidades por lata quando não há `numeroBuracosAssadeira` nem `unidadesPorAssadeiraCadastro` úteis.
   * @default 1
   */
  unidadesPorLata?: number;
  /** `assadeiras.numero_buracos` — prioridade para contar pães/unidades por lata. */
  numeroBuracosAssadeira?: number;
  /** `produto_assadeiras.unidades_por_assadeira` — usado se buracos ≤ 0. */
  unidadesPorAssadeiraCadastro?: number;
  /** Unidades por caixa explícitas (opcional); se omitido, usa `boxUnits`. */
  unidadesPorCaixa?: number | null;
  /** `produtos.box_units` quando não há `unidadesPorCaixa`. */
  boxUnits?: number | null;
}

/**
 * Unidades de produto (ex.: pães) por lata: prioriza buracos da assadeira, senão cadastro produto×assadeira.
 */
export function unidadesProdutoPorLata(input: {
  numeroBuracosAssadeira?: number;
  unidadesPorAssadeiraCadastro?: number;
  unidadesPorLataFallback?: number;
}): number {
  const br = Math.round(Number(input.numeroBuracosAssadeira ?? 0));
  if (br > 0) return br;
  const ua = Math.round(Number(input.unidadesPorAssadeiraCadastro ?? 0));
  if (ua > 0) return ua;
  const leg = Math.round(Number(input.unidadesPorLataFallback ?? 0));
  return leg > 0 ? leg : 1;
}

/**
 * Estima caixas a partir de latas, unidades por lata (buracos/cadastro) e unidades por caixa
 * (`unidadesPorCaixa` ou `box_units` do produto).
 * Sem unidades/caixa válidas, devolve unidades totais (comportamento informativo legado).
 */
export function estimateCaixasFromLatas(input: EstimateCaixasFromLatasInput): number {
  const latas = Math.max(0, Number(input.latas) || 0);
  const perLata = unidadesProdutoPorLata({
    numeroBuracosAssadeira: input.numeroBuracosAssadeira,
    unidadesPorAssadeiraCadastro: input.unidadesPorAssadeiraCadastro,
    unidadesPorLataFallback: input.unidadesPorLata,
  });
  const unidadesTotais = latas * perLata;

  const ucxRaw =
    input.unidadesPorCaixa != null && Number(input.unidadesPorCaixa) > 0
      ? Number(input.unidadesPorCaixa)
      : input.boxUnits != null && Number(input.boxUnits) > 0
        ? Number(input.boxUnits)
        : null;

  if (ucxRaw == null || !Number.isFinite(ucxRaw) || ucxRaw <= 0) {
    return unidadesTotais;
  }

  return Math.ceil(unidadesTotais / ucxRaw);
}

export interface EstimateLatasFromCaixasInput {
  caixas: number;
  /** @default 1 */
  unidadesPorLata?: number;
  numeroBuracosAssadeira?: number;
  unidadesPorAssadeiraCadastro?: number;
  unidadesPorCaixa?: number | null;
  boxUnits?: number | null;
}

/**
 * Inverso de {@link estimateCaixasFromLatas}: estima as latas necessárias para um número de caixas.
 * Sem unidades/caixa válidas, trata `caixas` como unidades totais (simétrico ao comportamento legado).
 * Arredonda para cima (latas inteiras suficientes para preencher as caixas pedidas).
 */
export function estimateLatasFromCaixas(input: EstimateLatasFromCaixasInput): number {
  const caixas = Math.max(0, Number(input.caixas) || 0);
  const perLata = unidadesProdutoPorLata({
    numeroBuracosAssadeira: input.numeroBuracosAssadeira,
    unidadesPorAssadeiraCadastro: input.unidadesPorAssadeiraCadastro,
    unidadesPorLataFallback: input.unidadesPorLata,
  });

  const ucxRaw =
    input.unidadesPorCaixa != null && Number(input.unidadesPorCaixa) > 0
      ? Number(input.unidadesPorCaixa)
      : input.boxUnits != null && Number(input.boxUnits) > 0
        ? Number(input.boxUnits)
        : null;

  const unidadesTotais =
    ucxRaw == null || !Number.isFinite(ucxRaw) || ucxRaw <= 0 ? caixas : caixas * ucxRaw;

  if (perLata <= 0) return Math.ceil(unidadesTotais);
  return Math.ceil(unidadesTotais / perLata);
}

/** Metadados da lata na OP (ordem diária: `qtd_planejada` = número de latas). */
export type PlanejadoUnidadesConsumoOpInput = {
  qtd_planejada: number;
  assadeira_id?: string | null;
  numeroBuracosAssadeira?: number;
  unidadesPorAssadeiraCadastro?: number;
};

/**
 * Unidades de consumo planejadas para etapas/fila.
 * Com `assadeira_id`: `qtd_planejada` são latas × un./lata (buracos/cadastro).
 * Sem lata na OP: converte pela unidade padrão do produto (cx/un/pct).
 */
export function planejadoUnidadesConsumoFromOp(
  op: PlanejadoUnidadesConsumoOpInput,
  product: ProductConversionInfo,
): number {
  const latas = Math.max(0, Number(op.qtd_planejada) || 0);
  const assadeiraId = op.assadeira_id?.trim();
  if (assadeiraId) {
    const perLata = unidadesProdutoPorLata({
      numeroBuracosAssadeira: op.numeroBuracosAssadeira,
      unidadesPorAssadeiraCadastro: op.unidadesPorAssadeiraCadastro,
    });
    return latas * perLata;
  }
  return quantidadePlanejadaParaUnidadesConsumo(latas, product);
}

/**
 * Unidades por lata (buracos/cadastro da OP) para converter unidades de consumo → LT nas etapas
 * fermentação/forno. Sem lata na OP, usa `produtos.unidades_assadeira`.
 */
export function unidadesPorLataResolvidaParaOp(
  op: PlanejadoUnidadesConsumoOpInput,
  product: ProductConversionInfo,
): number | null {
  const assadeiraId = op.assadeira_id?.trim();
  if (assadeiraId) {
    const perLata = unidadesProdutoPorLata({
      numeroBuracosAssadeira: op.numeroBuracosAssadeira,
      unidadesPorAssadeiraCadastro: op.unidadesPorAssadeiraCadastro,
    });
    return perLata > 0 ? perLata : null;
  }
  const ua = product.unidades_assadeira;
  return ua != null && ua > 0 ? ua : null;
}
