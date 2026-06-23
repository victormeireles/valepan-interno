import { deriveQuantidadesFromAssadeiras } from '@/domain/producao/ordem-derivados';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { AssadeiraMetaContext } from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

export type EtapaCascataEtapaDisplay = {
  produzido: number;
  meta: number;
  finalizada: boolean;
};

export type EtapaCascataDisplay = {
  fermentacao: EtapaCascataEtapaDisplay;
  forno: EtapaCascataEtapaDisplay;
};

function opMetaLt(ordem: OrdemProducaoRecord): number {
  const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
  return modo === 'assadeiras' ? ordem.assadeiras : ordem.quantidade.unidades;
}

export function buildEtapaCascataDisplay(params: {
  ordem: OrdemProducaoRecord;
  fermentacaoProduzidoLt?: number;
  fornoProduzidoLt?: number;
}): EtapaCascataDisplay {
  const { ordem, fermentacaoProduzidoLt = 0, fornoProduzidoLt = 0 } = params;
  const metaOp = opMetaLt(ordem);

  const fermentacaoMeta =
    ordem.fermentacaoMetaConfirmada != null ? ordem.fermentacaoMetaConfirmada : metaOp;
  const fermentacaoProduzido =
    ordem.fermentacaoFinalizada && ordem.fermentacaoMetaConfirmada != null
      ? ordem.fermentacaoMetaConfirmada
      : fermentacaoProduzidoLt;

  const fornoMeta =
    ordem.fornoMetaConfirmada != null
      ? ordem.fornoMetaConfirmada
      : ordem.fermentacaoMetaConfirmada != null
        ? ordem.fermentacaoMetaConfirmada
        : !ordem.fermentacaoFinalizada && fermentacaoProduzidoLt > 0
          ? fermentacaoProduzidoLt
          : metaOp;
  const fornoProduzido =
    ordem.fornoFinalizada && ordem.fornoMetaConfirmada != null
      ? ordem.fornoMetaConfirmada
      : fornoProduzidoLt;

  return {
    fermentacao: {
      produzido: fermentacaoProduzido,
      meta: fermentacaoMeta,
      finalizada: ordem.fermentacaoFinalizada,
    },
    forno: {
      produzido: fornoProduzido,
      meta: fornoMeta,
      finalizada: ordem.fornoFinalizada,
    },
  };
}

export function converterLtParaCaixasEmbalagem(
  assadeiras: number,
  assadeiraCtx: AssadeiraMetaContext,
): number {
  if (assadeiras <= 0) return 0;
  return deriveQuantidadesFromAssadeiras({
    assadeiras,
    unidadesPorAssadeira: assadeiraCtx.unidadesPorAssadeira,
    boxUnits: assadeiraCtx.boxUnits,
  }).caixas;
}
