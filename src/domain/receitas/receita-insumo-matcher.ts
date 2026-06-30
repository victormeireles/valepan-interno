import { jaccardSimilarity } from '@/domain/insumos/insumo-fuzzy-matcher';
import { normalizeInsumoDescricao } from '@/domain/insumos/insumo-ignorar-keywords';
import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';
import type {
  ReceitaImportLinhaRevisao,
  ReceitaImportMatchStatus,
  ReceitaPlanilhaLinhaParseada,
} from './receita-planilha-types';

const AUTO_THRESHOLD = 0.85;
const REVIEW_THRESHOLD = 0.5;

function resolveStatus(score: number): ReceitaImportMatchStatus {
  if (score >= AUTO_THRESHOLD) return 'matched';
  if (score >= REVIEW_THRESHOLD) return 'review';
  return 'not_found';
}

function findExactMatch(nomeColado: string, catalogo: InsumoCatalogoItem[]) {
  const key = normalizeInsumoDescricao(nomeColado);
  return catalogo.find((item) => normalizeInsumoDescricao(item.nome) === key) ?? null;
}

function findFuzzyMatch(nomeColado: string, catalogo: InsumoCatalogoItem[]) {
  let best: { item: InsumoCatalogoItem; score: number } | null = null;
  for (const item of catalogo) {
    const score = jaccardSimilarity(nomeColado, item.nome);
    if (
      !best ||
      score > best.score ||
      (score === best.score && item.nome.length < best.item.nome.length)
    ) {
      best = { item, score };
    }
  }
  return best;
}

function newRowId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function matchLinhasComCatalogo(
  linhas: ReceitaPlanilhaLinhaParseada[],
  catalogo: InsumoCatalogoItem[],
  usedInsumoIds: Set<string>,
): ReceitaImportLinhaRevisao[] {
  const used = new Set(usedInsumoIds);

  return linhas.map((linha) => {
    const base = {
      id: newRowId(),
      nomeColado: linha.nomeColado,
      quantidade: linha.quantidade,
      insumoId: null as string | null,
      insumoNome: null as string | null,
      unidadeDescricao: null as string | null,
      custoUnitario: null as number | null,
      score: null as number | null,
      status: 'not_found' as ReceitaImportMatchStatus,
    };

    const exact = findExactMatch(linha.nomeColado, catalogo);
    const fuzzy = findFuzzyMatch(linha.nomeColado, catalogo);
    const candidate = exact ?? fuzzy?.item ?? null;
    const score = exact ? 1 : (fuzzy?.score ?? 0);

    if (!candidate) return base;

    if (used.has(candidate.id)) {
      return { ...base, skippedDuplicate: true };
    }

    const status = exact ? 'matched' : resolveStatus(score);
    if (status !== 'not_found') used.add(candidate.id);

    return {
      ...base,
      insumoId: status === 'not_found' ? null : candidate.id,
      insumoNome: status === 'not_found' ? null : candidate.nome,
      unidadeDescricao: candidate.unidadeNome || candidate.unidadeCodigo,
      custoUnitario: status === 'not_found' ? null : candidate.custoUnitario,
      score,
      status,
    };
  });
}
