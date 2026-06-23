import {
  buildEmbalagemCardDisplayEntries,
  buildEmbalagemDisplayEntries,
  derivarUnidadeEmbalagem,
  pedidoUsaCaixasOuPacotes,
} from '@/domain/embalagem/painel-quantidade';
import type { PainelLoteEmbalagem, PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { RealizadoItemEmbalagem } from '@/domain/types/realizado';

export type PainelLoteItem = RealizadoItemEmbalagem & {
  loteId?: string;
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
  const exibicao = resolverExibicaoLoteEmbalagem(pedido, lote);

  return {
    loteId: lote.loteId,
    cliente: pedido.cliente,
    produto: pedido.produto,
    observacao: pedido.observacao,
    congelado: pedido.congelado ?? 'Não',
    unidade: exibicao.unidade,
    aProduzir: exibicao.produzido,
    produzido: exibicao.produzido,
    dataFabricacao: pedido.dataFabricacao,
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
  if (pedido.finalizada) return true;
  return pedido.aProduzir > 0 && pedido.produzidoScalar >= pedido.aProduzir;
}

function resolverExibicaoLoteEmbalagem(
  pedido: PainelPedidoEmbalagem,
  lote: PainelLoteEmbalagem,
): { unidade: PainelLoteItem['unidade']; produzido: number } {
  if (pedidoUsaCaixasOuPacotes(pedido.pedido)) {
    const { unidade, valor } = derivarUnidadeEmbalagem(lote.quantidade);
    return { unidade, produzido: valor };
  }

  const valor =
    pedido.unidade === 'kg' ? lote.quantidade.kg : lote.quantidade.unidades;
  return { unidade: pedido.unidade, produzido: valor };
}

export function buildLoteEmbalagemDisplayEntries(
  pedido: Pick<PainelPedidoEmbalagem, 'pedido' | 'unidade'>,
  quantidade: PainelLoteEmbalagem['quantidade'],
) {
  if (pedidoUsaCaixasOuPacotes(pedido.pedido)) {
    return buildEmbalagemDisplayEntries(quantidade);
  }
  return buildEmbalagemCardDisplayEntries(quantidade, pedido.unidade);
}
