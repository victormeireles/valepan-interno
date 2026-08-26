import type { Insumo } from '@/app/actions/insumos-actions';
import { InsumoUnidadeConversaoFormatter } from '@/domain/insumos/insumo-unidade-conversao-formatter';

export function formatInsumoUnidadeConfigLabel(insumo: Insumo): string {
  const unidadeOficial =
    insumo.unidades?.nome_resumido || insumo.unidades?.nome || '—';
  const conversaoUnidade =
    insumo.conversao_unidades?.nome_resumido ||
    insumo.conversao_unidades?.nome ||
    null;
  const fator =
    insumo.conversao_fator != null ? Number(insumo.conversao_fator) : null;

  if (!conversaoUnidade || fator == null || fator <= 0) {
    return unidadeOficial;
  }

  const formatter = InsumoUnidadeConversaoFormatter.create(unidadeOficial, {
    unidadeExibicao: conversaoUnidade,
    fator,
  });
  const fatorLabel = formatter.formatFatorLabel();
  return fatorLabel ? `${unidadeOficial} · ${fatorLabel}` : unidadeOficial;
}
