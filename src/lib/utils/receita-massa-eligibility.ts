/**
 * Decide se um vínculo produto↔receita representa a receita de MASSA do produto.
 * No modelo multitipo, `produto_receitas.tipo` é a fonte de verdade quando existir;
 * caso contrário usa-se `receitas.tipo` (compatível com bases antigas).
 */
export function isVinculoReceitaMassaAtiva(pr: {
  tipo?: string | null;
  receitas?: { tipo?: string | null; ativo?: boolean | null } | null;
}): boolean {
  const receita = pr.receitas;
  if (receita?.ativo === false) {
    return false;
  }
  const linkTipo = pr.tipo;
  if (linkTipo != null && linkTipo !== '') {
    return linkTipo === 'massa';
  }
  return receita?.tipo === 'massa';
}
