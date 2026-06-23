import type { OrdemEtapaStatusFields } from '@/domain/types/ordem-producao-etapa';

export const DEFAULT_ORDEM_ETAPA_STATUS: OrdemEtapaStatusFields = {
  fermentacaoFinalizada: false,
  fermentacaoMetaConfirmada: null,
  fermentacaoFinalizadaEm: null,
  fornoFinalizada: false,
  fornoMetaConfirmada: null,
  fornoFinalizadaEm: null,
  embalagemFinalizada: false,
  embalagemMetaConfirmada: null,
  embalagemFinalizadaEm: null,
};
