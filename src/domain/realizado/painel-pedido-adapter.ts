import { derivarUnidadePrincipal } from '@/domain/embalagem/painel-quantidade';
import type { PainelLoteEmbalagem, PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { RealizadoItemEmbalagem } from '@/domain/types/realizado';

export type PainelLoteItem = RealizadoItemEmbalagem & {
  pedidoEmbalagemId?: string;
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
  metaCaixas?: number;
  metaPacotes?: number;
  metaUnidades?: number;
  metaKg?: number;
  obsEmbalagem?: string;
  producaoUpdatedAt?: string;
};

export function loteToPainelItem(
  pedido: PainelPedidoEmbalagem,
  lote: PainelLoteEmbalagem,
): PainelLoteItem {
  const { unidade, valor } = derivarUnidadePrincipal(lote.quantidade);

  return {
    cliente: pedido.cliente,
    produto: pedido.produto,
    observacao: pedido.observacao,
    congelado: lote.congelado,
    unidade,
    aProduzir: valor,
    produzido: valor,
    dataFabricacao: pedido.dataFabricacao,
    rowId: lote.planilhaRowId,
    caixas: lote.quantidade.caixas,
    pacotes: lote.quantidade.pacotes,
    unidades: lote.quantidade.unidades,
    kg: lote.quantidade.kg,
    pacoteFotoUrl: lote.pacoteFotoUrl,
    pacoteFotoId: lote.pacoteFotoId,
    pacoteFotoUploadedAt: lote.pacoteFotoUploadedAt,
    etiquetaFotoUrl: lote.etiquetaFotoUrl,
    etiquetaFotoId: lote.etiquetaFotoId,
    etiquetaFotoUploadedAt: lote.etiquetaFotoUploadedAt,
    palletFotoUrl: lote.palletFotoUrl,
    palletFotoId: lote.palletFotoId,
    palletFotoUploadedAt: lote.palletFotoUploadedAt,
    obsEmbalagem: lote.obsEmbalagem,
    producaoUpdatedAt: lote.produzidoEm,
    pedidoEmbalagemId: pedido.pedidoEmbalagemId,
    pedidoCaixas: 0,
    pedidoPacotes: 0,
    pedidoUnidades: 0,
    pedidoKg: 0,
    metaCaixas: pedido.pedido.caixas,
    metaPacotes: pedido.pedido.pacotes,
    metaUnidades: pedido.pedido.unidades,
    metaKg: pedido.pedido.kg,
  };
}

export function isPedidoEmbalagemFinalizado(pedido: PainelPedidoEmbalagem): boolean {
  return pedido.aProduzir > 0 && pedido.produzidoScalar >= pedido.aProduzir;
}
