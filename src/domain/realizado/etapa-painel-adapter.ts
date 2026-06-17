import type { PainelLoteEtapa, PainelOrdemEtapa } from '@/domain/types/painel-etapa';

export type PainelLoteItemEtapa = {
  loteId: string;
  produto: string;
  ordemProducaoId: string;
  aProduzir: number;
  produzido: number;
  unidade: 'lt' | 'un';
  assadeiras?: number;
  unidades?: number;
  produzidoEm?: string;
  fotoUrl?: string;
  fotoId?: string;
  fotoUploadedAt?: string;
  modoQuantidade: PainelOrdemEtapa['modoQuantidade'];
};

export function loteToPainelItemEtapa(
  ordem: PainelOrdemEtapa,
  lote: PainelLoteEtapa,
): PainelLoteItemEtapa {
  const produzido = ordem.modoQuantidade === 'assadeiras' ? lote.assadeiras : lote.unidades;

  return {
    loteId: lote.loteId,
    produto: ordem.produto,
    ordemProducaoId: ordem.ordemProducaoId,
    aProduzir: produzido,
    produzido,
    unidade: ordem.unidade,
    assadeiras: lote.assadeiras,
    unidades: lote.unidades,
    produzidoEm: lote.produzidoEm,
    fotoUrl: lote.fotoUrl,
    fotoId: lote.fotoId,
    fotoUploadedAt: lote.fotoUploadedAt,
    modoQuantidade: ordem.modoQuantidade,
  };
}

export function splitOrdensPorFinalizacao(ordens: PainelOrdemEtapa[]): {
  naoFinalizados: PainelOrdemEtapa[];
  finalizados: PainelOrdemEtapa[];
} {
  const naoFinalizados: PainelOrdemEtapa[] = [];
  const finalizados: PainelOrdemEtapa[] = [];

  for (const ordem of ordens) {
    const percentual =
      ordem.aProduzir > 0 ? (ordem.produzido / ordem.aProduzir) * 100 : 0;

    if (percentual >= 90) {
      finalizados.push(ordem);
    } else {
      naoFinalizados.push(ordem);
    }
  }

  return { naoFinalizados, finalizados };
}
