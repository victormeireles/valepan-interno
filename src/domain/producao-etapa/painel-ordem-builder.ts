import {
  derivarEscalarEtapa,
  resolveModoQuantidadeEtapa,
  somarLotesEtapa,
  type EtapaQuantidade,
} from '@/domain/producao-etapa/etapa-quantidade';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import type { PainelLoteEtapa, PainelOrdemEtapa } from '@/domain/types/painel-etapa';

export type BuildPainelOrdemInput = {
  ordem: OrdemProducaoRecord;
  lotes: FermentacaoLoteRecord[];
  produto: string;
  tipoEstoque: string;
  assadeiraNome?: string;
};

export function mapLoteToPainelEtapa(lote: FermentacaoLoteRecord): PainelLoteEtapa {
  return {
    loteId: lote.id,
    modo: lote.modo,
    assadeiras: lote.assadeiras,
    unidades: lote.unidades,
    produzidoEm: lote.produzidoEm,
    fotoUrl: lote.fotos?.fotoUrl,
    fotoId: lote.fotos?.fotoId,
    fotoUploadedAt: lote.fotos?.fotoUploadedAt,
  };
}

export function buildPainelOrdem(input: BuildPainelOrdemInput): PainelOrdemEtapa {
  const { ordem, lotes, produto, tipoEstoque, assadeiraNome } = input;
  const modoQuantidade = resolveModoQuantidadeEtapa(ordem.assadeiraId);
  const pedido: EtapaQuantidade = {
    assadeiras: ordem.assadeiras,
    unidades: ordem.quantidade.unidades,
  };
  const produzidoBreakdown = somarLotesEtapa(
    lotes.map((lote) => ({
      assadeiras: lote.assadeiras,
      unidades: lote.unidades,
    })),
  );
  const { unidade, aProduzir, produzido } = derivarEscalarEtapa(
    pedido,
    produzidoBreakdown,
    modoQuantidade,
  );

  return {
    ordemProducaoId: ordem.id,
    produto,
    tipoEstoque,
    observacao: ordem.observacao,
    dataProducao: ordem.dataProducao,
    modoQuantidade,
    pedido,
    produzidoBreakdown,
    unidade,
    aProduzir,
    produzido,
    assadeiraNome: ordem.assadeiraId ? assadeiraNome : undefined,
    lotes: lotes.map(mapLoteToPainelEtapa),
  };
}
