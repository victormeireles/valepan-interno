import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';

export function filterIntegracaoInsumos(
  items: IntegracaoInsumoListItem[],
  searchTerm: string,
): IntegracaoInsumoListItem[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return items;

  return items.filter((item) => {
    const haystack = [
      item.descricao_omie,
      item.omie_codigo_produto,
      String(item.omie_id_produto),
      item.empresaNome,
      item.insumoNome,
      item.contexto.fornecedorTitulo,
      item.contexto.fornecedorSubtitulo,
      ...item.contexto.fornecedores.map((fornecedor) => fornecedor.label),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });
}
