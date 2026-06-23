export type EtapaProducaoSlug = 'fermentacao' | 'forno' | 'embalagem';

export type OrdemEtapaStatusFields = {
  fermentacaoFinalizada: boolean;
  fermentacaoMetaConfirmada: number | null;
  fermentacaoFinalizadaEm: string | null;
  fornoFinalizada: boolean;
  fornoMetaConfirmada: number | null;
  fornoFinalizadaEm: string | null;
  embalagemFinalizada: boolean;
  embalagemMetaConfirmada: number | null;
  embalagemFinalizadaEm: string | null;
};
