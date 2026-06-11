export type ProdutoPesoInput = {
  unit_weight: number | null;
  nome: string;
};

const GRAMATURA_NOME_REGEX = /(\d+(?:[.,]\d+)?)\s*g\b/i;

export function extractPesoGramasFromNome(nome: string): number | null {
  const match = nome.match(GRAMATURA_NOME_REGEX);
  if (!match) return null;
  const normalized = match[1].replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function resolvePesoGramas(input: ProdutoPesoInput): number | null {
  if (input.unit_weight != null && input.unit_weight > 0) {
    if (input.unit_weight < 10) {
      return Math.round(input.unit_weight * 1000);
    }
    return Math.round(input.unit_weight);
  }
  return extractPesoGramasFromNome(input.nome);
}
