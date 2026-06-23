import { sortPorOrdemPlanejamento } from '@/domain/realizado/ordem-planejamento-sort';
import type { PainelLoteEtapa, PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import type {
  EtapaQuantidade,
  ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';
import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';

export function buildEtapaDetalhesQuantidade(
  qty: EtapaQuantidade,
  modo: ModoQuantidadeEtapa,
): QuantityBreakdownEntry[] {
  if (modo === 'assadeiras') {
    return qty.assadeiras > 0 ? [{ quantidade: qty.assadeiras, unidade: 'lt' }] : [];
  }
  return qty.unidades > 0 ? [{ quantidade: qty.unidades, unidade: 'un' }] : [];
}

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

export function getOrdemEtapaFilterStatus(
  ordem: PainelOrdemEtapa,
): 'pendente' | 'andamento' | 'concluido' {
  if (ordem.finalizada) return 'concluido';
  if (ordem.produzido === 0) return 'pendente';
  return 'andamento';
}

export function splitOrdensPorFinalizacao(ordens: PainelOrdemEtapa[]): {
  naoFinalizados: PainelOrdemEtapa[];
  finalizados: PainelOrdemEtapa[];
} {
  const naoFinalizados: PainelOrdemEtapa[] = [];
  const finalizados: PainelOrdemEtapa[] = [];

  for (const ordem of ordens) {
    if (ordem.finalizada) {
      finalizados.push(ordem);
    } else {
      naoFinalizados.push(ordem);
    }
  }

  return {
    naoFinalizados: sortOrdensPorPlanejamento(naoFinalizados),
    finalizados: sortOrdensPorPlanejamento(finalizados),
  };
}

export function sortOrdensPorPlanejamento(
  ordens: PainelOrdemEtapa[],
): PainelOrdemEtapa[] {
  return sortPorOrdemPlanejamento(ordens);
}
