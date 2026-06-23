import { loteFromDataFabricacaoEtiqueta } from '@/domain/embalagem/lote-from-data-fabricacao';
import {
  derivarUnidadePrincipal,
  somarQuantidades,
} from '@/domain/embalagem/painel-quantidade';
import { buildEtapaCascataDisplay } from '@/domain/producao-etapa/etapa-cascata-display';
import { buildEmbalagemCadeiaBarras } from '@/domain/producao-etapa/build-etapa-cadeia-barras';
import {
  resolveMetaEfetiva,
  resolveMetaPlanejada,
  type AssadeiraMetaContext,
} from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';
import type {
  PainelLoteEmbalagem,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';

export function mapLoteToPainel(
  lote: EmbalagemLoteRecord,
  congeladoFromTipo: 'Sim' | 'Não' = 'Não',
): PainelLoteEmbalagem {
  return {
    loteId: lote.id,
    modo: lote.modo,
    quantidade: { ...lote.quantidade },
    produzidoEm: lote.produzidoEm,
    obsEmbalagem: lote.obsEmbalagem ?? undefined,
    congelado: congeladoFromTipo,
    lote: lote.lote,
    pacoteFotoUrl: lote.fotos?.pacoteFotoUrl,
    pacoteFotoId: lote.fotos?.pacoteFotoId,
    pacoteFotoUploadedAt: lote.fotos?.pacoteFotoUploadedAt,
    etiquetaFotoUrl: lote.fotos?.etiquetaFotoUrl,
    etiquetaFotoId: lote.fotos?.etiquetaFotoId,
    etiquetaFotoUploadedAt: lote.fotos?.etiquetaFotoUploadedAt,
    palletFotoUrl: lote.fotos?.palletFotoUrl,
    palletFotoId: lote.fotos?.palletFotoId,
    palletFotoUploadedAt: lote.fotos?.palletFotoUploadedAt,
  };
}

export function buildPainelPedido(
  pedido: PedidoEmbalagemRecord,
  cliente: string,
  produto: string,
  lotes: EmbalagemLoteRecord[],
  possuiEtiqueta: boolean,
  congeladoFromTipo: 'Sim' | 'Não',
  assadeiraCtx?: AssadeiraMetaContext,
  etapasProduzidoLt?: { fermentacao?: number; forno?: number },
): PainelPedidoEmbalagem {
  const painelLotes = lotes.map((l) => mapLoteToPainel(l, congeladoFromTipo));
  const produzido = somarQuantidades(painelLotes.map((l) => l.quantidade));
  const { unidade } = derivarUnidadePrincipal(pedido.quantidade);
  const { valor: produzidoScalar } = derivarUnidadePrincipal(produzido);
  const metaPlanejada = resolveMetaPlanejada('embalagem', pedido);
  const fornoProduzidoLt = etapasProduzidoLt?.forno ?? 0;
  const metaEfetiva = resolveMetaEfetiva('embalagem', pedido, assadeiraCtx, {
    fermentacaoProduzidoLt: etapasProduzidoLt?.fermentacao ?? 0,
    fornoProduzidoLt,
  });
  const cascata = buildEtapaCascataDisplay({
    ordem: pedido,
    fermentacaoProduzidoLt: etapasProduzidoLt?.fermentacao ?? 0,
    fornoProduzidoLt,
  });

  const producaoUpdatedAt = painelLotes
    .map((l) => l.produzidoEm)
    .filter(Boolean)
    .sort()
    .at(-1);

  const painel: PainelPedidoEmbalagem = {
    pedidoEmbalagemId: pedido.id,
    ordemPlanejamento: pedido.ordemPlanejamento,
    cliente,
    produto,
    observacao: pedido.observacao,
    dataPedido: pedido.dataProducao,
    dataFabricacao: pedido.dataFabricacaoEtiqueta,
    congelado: congeladoFromTipo,
    pedido: { ...pedido.quantidade },
    produzido,
    unidade,
    aProduzir: metaEfetiva,
    produzidoScalar,
    metaPlanejada,
    metaEfetiva,
    finalizada: pedido.embalagemFinalizada,
    cascata,
    possuiEtiqueta,
    lote: loteFromDataFabricacaoEtiqueta(pedido.dataFabricacaoEtiqueta),
    lotes: painelLotes,
    producaoUpdatedAt,
  };

  if (assadeiraCtx) {
    painel.cadeiaBarras = buildEmbalagemCadeiaBarras(painel, assadeiraCtx);
  }

  return painel;
}
