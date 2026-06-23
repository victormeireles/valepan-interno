import { buildEtapaCascataDisplay } from '@/domain/producao-etapa/etapa-cascata-display';
import {
  resolveModoQuantidadeEtapa,
  somarLotesEtapa,
  type EtapaQuantidade,
} from '@/domain/producao-etapa/etapa-quantidade';
import { resolveEstimativaAnterior } from '@/domain/producao-etapa/etapa-estimativa-anterior-resolver';
import {
  resolveMetaEfetiva,
  resolveMetaPlanejada,
  resolveMetaReferencia,
} from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import type { PainelLoteEtapa, PainelOrdemEtapa } from '@/domain/types/painel-etapa';

export type BuildPainelOrdemInput = {
  etapa: 'fermentacao' | 'forno';
  ordem: OrdemProducaoRecord;
  lotes: FermentacaoLoteRecord[];
  produto: string;
  tipoEstoque: string;
  assadeiraNome?: string;
  fermentacaoProduzido?: number;
  fornoProduzido?: number;
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
  const { etapa, ordem, lotes, produto, tipoEstoque, assadeiraNome, fermentacaoProduzido, fornoProduzido } =
    input;
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
  const metaPlanejada = resolveMetaPlanejada(etapa, ordem);
  const metaEfetiva = resolveMetaEfetiva(etapa, ordem, undefined, {
    fermentacaoProduzidoLt: fermentacaoProduzido,
    fornoProduzidoLt: fornoProduzido,
  });
  const metaReferencia = resolveMetaReferencia(etapa, ordem);
  const unidade = modoQuantidade === 'assadeiras' ? 'lt' : 'un';
  const produzido =
    modoQuantidade === 'assadeiras'
      ? produzidoBreakdown.assadeiras
      : produzidoBreakdown.unidades;
  const finalizada =
    etapa === 'fermentacao' ? ordem.fermentacaoFinalizada : ordem.fornoFinalizada;
  const estimativaAnterior = resolveEstimativaAnterior({
    etapa,
    fermentacaoProduzido,
    fornoProduzido,
    fermentacaoFinalizada: ordem.fermentacaoFinalizada,
    fornoFinalizada: ordem.fornoFinalizada,
  });
  const cascata = buildEtapaCascataDisplay({
    ordem,
    fermentacaoProduzidoLt: fermentacaoProduzido,
    fornoProduzidoLt: fornoProduzido ?? (etapa === 'forno' ? produzido : 0),
  });

  return {
    ordemProducaoId: ordem.id,
    ordemPlanejamento: ordem.ordemPlanejamento,
    produto,
    tipoEstoque,
    observacao: ordem.observacao,
    dataProducao: ordem.dataProducao,
    modoQuantidade,
    pedido,
    produzidoBreakdown,
    unidade,
    aProduzir: metaEfetiva,
    produzido,
    metaPlanejada,
    metaEfetiva,
    metaReferencia,
    estimativaAnterior,
    finalizada,
    cascata,
    assadeiraNome: ordem.assadeiraId ? assadeiraNome : undefined,
    lotes: lotes.map(mapLoteToPainelEtapa),
  };
}
