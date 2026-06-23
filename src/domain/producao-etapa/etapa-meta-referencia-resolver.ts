import { deriveQuantidadesFromAssadeiras } from '@/domain/producao/ordem-derivados';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

export type AssadeiraMetaContext = {
  unidadesPorAssadeira: number;
  boxUnits?: number | null;
};

function resolveOpMetaAssadeirasOuUnidades(ordem: OrdemProducaoRecord): number {
  const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
  return modo === 'assadeiras' ? ordem.assadeiras : ordem.quantidade.unidades;
}

function resolveEmbalagemMetaFromFornoLt(
  fornoMetaConfirmada: number,
  assadeiraCtx?: AssadeiraMetaContext,
): number {
  if (!assadeiraCtx) {
    return 0;
  }

  return deriveQuantidadesFromAssadeiras({
    assadeiras: fornoMetaConfirmada,
    unidadesPorAssadeira: assadeiraCtx.unidadesPorAssadeira,
    boxUnits: assadeiraCtx.boxUnits,
  }).caixas;
}

function resolveMetaCascata(
  etapa: EtapaProducaoSlug,
  ordem: OrdemProducaoRecord,
  assadeiraCtx?: AssadeiraMetaContext,
): number {
  switch (etapa) {
    case 'fermentacao':
      return resolveOpMetaAssadeirasOuUnidades(ordem);
    case 'forno':
      return ordem.fermentacaoMetaConfirmada ?? resolveOpMetaAssadeirasOuUnidades(ordem);
    case 'embalagem':
      if (ordem.fornoMetaConfirmada != null) {
        return resolveEmbalagemMetaFromFornoLt(ordem.fornoMetaConfirmada, assadeiraCtx);
      }
      return ordem.quantidade.caixas;
  }
}

export function resolveMetaReferencia(
  etapa: EtapaProducaoSlug,
  ordem: OrdemProducaoRecord,
  assadeiraCtx?: AssadeiraMetaContext,
): number {
  return resolveMetaCascata(etapa, ordem, assadeiraCtx);
}

export type MetaEfetivaLiveContext = {
  fermentacaoProduzidoLt?: number;
  fornoProduzidoLt?: number;
};

export function resolveMetaEfetiva(
  etapa: EtapaProducaoSlug,
  ordem: OrdemProducaoRecord,
  assadeiraCtx?: AssadeiraMetaContext,
  live?: MetaEfetivaLiveContext,
): number {
  if (etapa === 'forno') {
    if (ordem.fermentacaoMetaConfirmada != null) {
      return ordem.fermentacaoMetaConfirmada;
    }
    const fermLt = live?.fermentacaoProduzidoLt ?? 0;
    if (fermLt > 0 && !ordem.fermentacaoFinalizada) {
      return fermLt;
    }
    return resolveOpMetaAssadeirasOuUnidades(ordem);
  }

  if (etapa === 'embalagem') {
    if (ordem.fornoMetaConfirmada != null) {
      return resolveEmbalagemMetaFromFornoLt(ordem.fornoMetaConfirmada, assadeiraCtx);
    }
    const fornoLt = live?.fornoProduzidoLt ?? 0;
    if (fornoLt > 0 && assadeiraCtx) {
      return resolveEmbalagemMetaFromFornoLt(fornoLt, assadeiraCtx);
    }
    if (ordem.fermentacaoMetaConfirmada != null && assadeiraCtx) {
      return resolveEmbalagemMetaFromFornoLt(
        ordem.fermentacaoMetaConfirmada,
        assadeiraCtx,
      );
    }
    const fermLt = live?.fermentacaoProduzidoLt ?? 0;
    if (fermLt > 0 && !ordem.fermentacaoFinalizada && assadeiraCtx) {
      return resolveEmbalagemMetaFromFornoLt(fermLt, assadeiraCtx);
    }
    return resolveMetaCascata(etapa, ordem, assadeiraCtx);
  }

  return resolveMetaCascata(etapa, ordem, assadeiraCtx);
}

export function resolveMetaPlanejada(
  etapa: EtapaProducaoSlug,
  ordem: OrdemProducaoRecord,
): number {
  switch (etapa) {
    case 'fermentacao':
    case 'forno':
      return resolveOpMetaAssadeirasOuUnidades(ordem);
    case 'embalagem': {
      const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
      return modo === 'assadeiras'
        ? ordem.quantidade.caixas
        : ordem.quantidade.unidades;
    }
  }
}
