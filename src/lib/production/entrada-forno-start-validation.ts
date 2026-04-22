import type { FermentacaoQualityData, FornoQualityData, ProductionStepLog } from '@/domain/types/producao-etapas';
import { normalizeNumeroCarrinhoFermentacao } from '@/lib/production/fermentacao-carrinho-uniqueness';

/**
 * Evita nova entrada no forno duplicada na mesma ordem (mesmo lote de fermentação ou mesmo nº de carrinho).
 */
export function assertNovaEntradaFornoSemDuplicata(
  ordemLogs: ProductionStepLog[],
  novoFermentacaoLogId: string | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!novoFermentacaoLogId) {
    return {
      ok: false,
      error: 'É necessário vincular o lote de fermentação (carrinho) à entrada no forno.',
    };
  }

  const ferm = ordemLogs.find((l) => l.id === novoFermentacaoLogId && l.etapa === 'fermentacao');
  if (!ferm) {
    return { ok: false, error: 'Lote de fermentação não encontrado para esta ordem.' };
  }

  const fdq = ferm.dados_qualidade as FermentacaoQualityData | null;
  const novoRotulo = normalizeNumeroCarrinhoFermentacao(fdq?.numero_carrinho);

  for (const l of ordemLogs) {
    if (l.etapa !== 'entrada_forno') continue;
    const edq = l.dados_qualidade as FornoQualityData | null;
    const eFermId = edq?.fermentacao_log_id;
    if (eFermId === novoFermentacaoLogId) {
      return {
        ok: false,
        error:
          'Já existe entrada no forno para este mesmo lote de fermentação. Exclua o registro duplicado na etapa ou use outro carrinho.',
      };
    }
    if (!novoRotulo || !eFermId) continue;
    const outroFerm = ordemLogs.find((x) => x.id === eFermId && x.etapa === 'fermentacao');
    const outroDq = outroFerm?.dados_qualidade as FermentacaoQualityData | null;
    const outroRotulo = normalizeNumeroCarrinhoFermentacao(outroDq?.numero_carrinho);
    if (outroRotulo === novoRotulo) {
      return {
        ok: false,
        error:
          'Já existe entrada no forno com este número de carrinho nesta ordem. Exclua o registro duplicado se for erro.',
      };
    }
  }

  return { ok: true };
}
