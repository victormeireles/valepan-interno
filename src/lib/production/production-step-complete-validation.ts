import type {
  FermentacaoQualityData,
  ProductionStep,
  QualityData,
} from '@/domain/types/producao-etapas';

/**
 * Validação ao concluir etapa (mensagens estáveis para o operador).
 * Amplie por etapa conforme novos fluxos passarem a usar `completeProductionStep`.
 */
export function validateCompleteProductionStepQuality(
  etapa: ProductionStep,
  dados: QualityData | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (dados == null || typeof dados !== 'object') {
    return { ok: false, error: 'Dados de qualidade são obrigatórios para concluir esta etapa.' };
  }

  switch (etapa) {
    case 'fermentacao': {
      const d = dados as FermentacaoQualityData;
      const car =
        typeof d.numero_carrinho === 'string'
          ? d.numero_carrinho.trim()
          : String(d.numero_carrinho ?? '').trim();
      if (!car) {
        return { ok: false, error: 'Informe o número do carrinho para concluir a fermentação.' };
      }
      if (d.assadeiras_lt == null || !Number.isFinite(Number(d.assadeiras_lt))) {
        return { ok: false, error: 'Informe a quantidade de latas (LT) produzidas.' };
      }
      const lt = Math.round(Number(d.assadeiras_lt));
      if (lt < 1) {
        return { ok: false, error: 'Informe pelo menos 1 lata (LT).' };
      }
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}
