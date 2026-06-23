import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';

const IGNORAR_KEYWORDS = [
  'SERVICO',
  'SERVIÇO',
  'FRETE',
  'MANUTEN',
  'LOCACAO',
  'LOCAÇÃO',
  'MAO DE OBRA',
  'MÃO DE OBRA',
  'HONORARIO',
  'HONORÁRIO',
  'TAXA',
  'JUROS',
  'MULTA',
];

export type FuzzyMatchResult = {
  insumoId: string;
  insumoNome: string;
  fatorConversao: number;
  score: number;
};

export type IgnorarKeywordResult = {
  motivo: string;
  confianca: number;
};

export function normalizeInsumoText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'EM', 'COM', 'PARA', 'POR']);

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeInsumoText(text)
      .split(' ')
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

export function jaccardSimilarity(left: string, right: string): number {
  const setLeft = tokenSet(left);
  const setRight = tokenSet(right);
  if (setLeft.size === 0 || setRight.size === 0) return 0;

  let intersection = 0;
  for (const token of setLeft) {
    if (setRight.has(token)) intersection += 1;
  }

  const union = setLeft.size + setRight.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function detectIgnorarKeyword(descricao: string): IgnorarKeywordResult | null {
  const normalized = normalizeInsumoText(descricao);
  const matched = IGNORAR_KEYWORDS.find((keyword) => normalized.includes(keyword));
  if (!matched) return null;

  return {
    motivo: `Descrição contém "${matched}" — provável serviço ou despesa, não insumo`,
    confianca: 85,
  };
}

export function inferFatorConversao(descricaoOmie: string, unidadeNf: string | null): number {
  const weightMatch = descricaoOmie.match(/(\d+(?:[.,]\d+)?)\s*KG\b/i);
  if (weightMatch) {
    const peso = Number(weightMatch[1].replace(',', '.'));
    if (Number.isFinite(peso) && peso > 0) return peso;
  }

  const unidade = (unidadeNf ?? '').trim().toUpperCase();
  if (unidade === 'KG' || unidade === 'G' || unidade === 'UN') return 1;
  return 1;
}

export class InsumoFuzzyMatcher {
  findBestMatch(
    descricaoOmie: string,
    unidadeNf: string | null,
    catalogo: InsumoCatalogoItem[],
  ): FuzzyMatchResult | null {
    let best: FuzzyMatchResult | null = null;

    for (const insumo of catalogo) {
      const score = jaccardSimilarity(descricaoOmie, insumo.nome);
      if (!best || score > best.score) {
        best = {
          insumoId: insumo.id,
          insumoNome: insumo.nome,
          fatorConversao: inferFatorConversao(descricaoOmie, unidadeNf),
          score,
        };
      }
    }

    if (!best || best.score < 0.55) return null;
    return best;
  }
}

export const insumoFuzzyMatcher = new InsumoFuzzyMatcher();
