import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import { formatISODateBrNoYear } from '@/lib/utils/date-utils';

export function buildOrdemAssadeiraLabel(ordem: OrdemProducaoPainelItem): string {
  if (ordem.assadeiraVariant === 'sem') return '—';
  const nome = ordem.assadeiraNome ?? '—';
  if (ordem.assadeiraVariant === 'alternativa') return `${nome} alt.`;
  return nome;
}

export function buildOrdemProdutoMeta(ordem: OrdemProducaoPainelItem): string {
  const etiqueta = formatISODateBrNoYear(ordem.dataEtiqueta);
  return `${ordem.tipoEstoque} • ${buildOrdemAssadeiraLabel(ordem)} • etiqueta ${etiqueta}`;
}

export function buildOrdemMobileDetails(ordem: OrdemProducaoPainelItem): string {
  const etiqueta = formatISODateBrNoYear(ordem.dataEtiqueta);
  return `${buildOrdemAssadeiraLabel(ordem)} • ${ordem.tipoEstoque} • ${etiqueta}`;
}
