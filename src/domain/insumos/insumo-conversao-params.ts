import type { InsumoConversaoVisual } from '@/domain/types/insumo-estoque';
import { InsumoUnidadeConversao } from '@/domain/insumos/insumo-unidade-conversao';

type UnidadeJoin =
  | { nome_resumido: string }
  | { nome_resumido: string }[]
  | null
  | undefined;

export function resolveUnidadeResumida(unidades: UnidadeJoin): string {
  if (Array.isArray(unidades)) return unidades[0]?.nome_resumido ?? '';
  return unidades?.nome_resumido ?? '';
}

export function resolveInsumoConversaoVisual(input: {
  conversaoFator: number | null | undefined;
  conversaoUnidade: UnidadeJoin;
}): InsumoConversaoVisual | null {
  return InsumoUnidadeConversao.fromFonte({
    conversaoFator: input.conversaoFator,
    conversaoUnidadeResumida: resolveUnidadeResumida(input.conversaoUnidade),
  }).configValue;
}

export function validateInsumoConversaoParams(input: {
  unidadeId: string;
  conversaoUnidadeId: string | null | undefined;
  conversaoFator: number | null | undefined;
}): { ok: true; conversaoUnidadeId: string | null; conversaoFator: number | null } | { ok: false; error: string } {
  const hasUnidade = Boolean(input.conversaoUnidadeId);
  const hasFator =
    input.conversaoFator != null &&
    Number.isFinite(input.conversaoFator) &&
    input.conversaoFator > 0;

  if (!hasUnidade && !hasFator) {
    return { ok: true, conversaoUnidadeId: null, conversaoFator: null };
  }

  if (hasUnidade !== hasFator) {
    return {
      ok: false,
      error: 'Informe a unidade de conferência e o fator juntos, ou deixe os dois vazios',
    };
  }

  if (input.conversaoUnidadeId === input.unidadeId) {
    return {
      ok: false,
      error: 'A unidade de conferência deve ser diferente da unidade oficial',
    };
  }

  return {
    ok: true,
    conversaoUnidadeId: input.conversaoUnidadeId ?? null,
    conversaoFator: Number(input.conversaoFator),
  };
}
