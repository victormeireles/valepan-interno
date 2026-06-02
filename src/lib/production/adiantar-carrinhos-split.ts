/**
 * Lógica pura para «Adiantar / Confirmar etapas» na fila: quebra o total de latas adiantadas
 * em carrinhos «fake» de no máximo {@link LATAS_POR_CARRINHO_ADIANTADO} LT cada, para que
 * apareçam como carrinhos selecionáveis na etapa seguinte (ex.: 100 LT → 5 carrinhos de 20).
 */

/** Capacidade operacional por carrinho adiantado (latas / bandejas por registo). */
export const LATAS_POR_CARRINHO_ADIANTADO = 20;

/** Teto de segurança de carrinhos criados num único adiantamento. */
export const MAX_CARRINHOS_ADIANTADOS = 50;

/**
 * Divide `total` em pedaços de no máximo `max` (ex.: 100 → [20,20,20,20,20]; 50 → [20,20,10]).
 * Garante pelo menos um carrinho quando o total é positivo.
 */
export function dividirLatasEmCarrinhos(
  total: number,
  max: number = LATAS_POR_CARRINHO_ADIANTADO,
): number[] {
  const cap = Math.max(1, Math.round(max));
  const t = Math.max(0, Math.round(Number(total) || 0));
  if (t <= 0) return [];
  const qtd = Math.min(MAX_CARRINHOS_ADIANTADOS, Math.ceil(t / cap));
  const out: number[] = [];
  let restante = t;
  for (let i = 0; i < qtd; i += 1) {
    const pedaco = Math.min(cap, restante);
    out.push(pedaco);
    restante -= pedaco;
  }
  return out;
}

/** Nome padrão de um carrinho adiantado (1-indexed). */
export function nomeCarrinhoAdiantadoPadrao(indice: number): string {
  return `Adiantado ${indice + 1}`;
}

/**
 * Resolve os nomes finais dos carrinhos: usa o número informado pelo operador quando presente
 * (campo opcional), senão cai para «Adiantado N». Mantém a contagem igual a `quantidade`.
 */
export function nomesCarrinhosAdiantados(
  quantidade: number,
  informados?: Array<string | null | undefined>,
): string[] {
  const qtd = Math.max(0, Math.round(quantidade));
  const out: string[] = [];
  for (let i = 0; i < qtd; i += 1) {
    const bruto = informados?.[i];
    const limpo = typeof bruto === 'string' ? bruto.trim() : '';
    out.push(limpo.length > 0 ? limpo : nomeCarrinhoAdiantadoPadrao(i));
  }
  return out;
}

export interface CarrinhoAdiantadoPlano {
  /** Nome a gravar em `numero_carrinho`. */
  numero: string;
  /** Latas (LT) deste carrinho (≤ {@link LATAS_POR_CARRINHO_ADIANTADO}). */
  latas: number;
}

/**
 * Plano completo de carrinhos a criar: combina a divisão por capacidade com os nomes resolvidos.
 */
export function planejarCarrinhosAdiantados(
  total: number,
  informados?: Array<string | null | undefined>,
  max: number = LATAS_POR_CARRINHO_ADIANTADO,
): CarrinhoAdiantadoPlano[] {
  const pedacos = dividirLatasEmCarrinhos(total, max);
  const nomes = nomesCarrinhosAdiantados(pedacos.length, informados);
  return pedacos.map((latas, i) => ({ numero: nomes[i], latas }));
}
