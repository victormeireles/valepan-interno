import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';

export function resolveEstimativaAnterior(params: {
  etapa: EtapaProducaoSlug;
  fermentacaoProduzido?: number;
  fornoProduzido?: number;
  fermentacaoFinalizada?: boolean;
  fornoFinalizada?: boolean;
}): number | null {
  const {
    etapa,
    fermentacaoProduzido,
    fornoProduzido,
    fermentacaoFinalizada = false,
    fornoFinalizada = false,
  } = params;

  if (etapa === 'forno' && !fermentacaoFinalizada) {
    return fermentacaoProduzido ?? null;
  }

  if (etapa === 'embalagem' && !fornoFinalizada) {
    return fornoProduzido ?? null;
  }

  return null;
}
