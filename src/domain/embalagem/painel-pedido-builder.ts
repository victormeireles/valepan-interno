import { loteFromDataFabricacaoEtiqueta } from '@/domain/embalagem/lote-from-data-fabricacao';
import {
  derivarUnidadePrincipal,
  somarQuantidades,
} from '@/domain/embalagem/painel-quantidade';
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
    planilhaRowId: lote.planilhaRowId,
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
): PainelPedidoEmbalagem {
  const painelLotes = lotes.map((l) => mapLoteToPainel(l, congeladoFromTipo));
  const produzido = somarQuantidades(painelLotes.map((l) => l.quantidade));
  const { unidade, valor: aProduzir } = derivarUnidadePrincipal(pedido.quantidade);
  const { valor: produzidoScalar } = derivarUnidadePrincipal(produzido);

  const producaoUpdatedAt = painelLotes
    .map((l) => l.produzidoEm)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    pedidoEmbalagemId: pedido.id,
    cliente,
    produto,
    observacao: pedido.observacao,
    dataPedido: pedido.dataProducao,
    dataFabricacao: pedido.dataFabricacaoEtiqueta,
    congelado: congeladoFromTipo,
    pedido: { ...pedido.quantidade },
    produzido,
    unidade,
    aProduzir,
    produzidoScalar,
    possuiEtiqueta,
    lote: loteFromDataFabricacaoEtiqueta(pedido.dataFabricacaoEtiqueta),
    lotes: painelLotes,
    producaoUpdatedAt,
  };
}
