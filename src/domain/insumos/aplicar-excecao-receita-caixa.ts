import type {
  InsumoReceitaMassaIngrediente,
  InsumoReceitaTipoContexto,
} from '@/domain/insumos/insumo-consumo-producao-types';

export const AVISO_EXCECAO_CAIXA_SEM_RECEITA_PRODUTO =
  'Exceção de caixa do tipo de estoque ignorada: produto sem receita de caixa';

export function aplicarExcecaoReceitaCaixa(
  receitas: InsumoReceitaTipoContexto[],
  ingredientesExcecao: InsumoReceitaMassaIngrediente[] | null,
): { receitas: InsumoReceitaTipoContexto[]; avisos: string[] } {
  if (ingredientesExcecao == null) {
    return { receitas, avisos: [] };
  }

  const temCaixa = receitas.some((item) => item.tipo === 'caixa');
  if (!temCaixa) {
    return { receitas, avisos: [AVISO_EXCECAO_CAIXA_SEM_RECEITA_PRODUTO] };
  }

  return {
    receitas: receitas.map((item) =>
      item.tipo === 'caixa' ? { ...item, ingredientes: ingredientesExcecao } : item,
    ),
    avisos: [],
  };
}
