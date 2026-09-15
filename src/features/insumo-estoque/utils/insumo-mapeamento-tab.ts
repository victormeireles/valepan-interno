import type { MapeamentoAbaId } from '@/domain/insumos/insumo-mapeamento-busca';

export function parseMapeamentoAbaId(value: string | null): MapeamentoAbaId {
  if (value === 'vinculos') return 'vinculos';
  if (value === 'ignorados') return 'ignorados';
  return 'pendencias';
}

export function buildMapeamentoTabHref(
  currentSearch: string,
  tab: MapeamentoAbaId,
): string {
  const params = new URLSearchParams(currentSearch);
  if (tab === 'pendencias') params.delete('tab');
  else params.set('tab', tab);
  const query = params.toString();
  return query ? `/mapeamento-insumos?${query}` : '/mapeamento-insumos';
}
